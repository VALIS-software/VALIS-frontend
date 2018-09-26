import { GenomeBrowser, GenomeBrowserConfiguration } from "genome-browser";
import { SharedTileStore } from "genome-browser";
import { TrackModel } from "genome-browser";

import Dialog from "material-ui/Dialog";
import FlatButton from "material-ui/FlatButton";
import IconButton from "material-ui/IconButton";

import CircularProgress from "material-ui/CircularProgress";
import { ContentReport } from "material-ui/svg-icons";
import * as React from "react";
import { EntityType, SiriusApi } from 'valis';
// styles
import "./App.scss";
import AppModel, { AppEvent } from "./model/AppModel";
import Persistable from "./model/Persistable";
import ViewModel, { ViewEvent } from "./model/ViewModel";
import { EntityDetails } from "./ui/components/EntityDetails/EntityDetails";
import Header from "./ui/components/Header/Header";
import NavigationController from "./ui/components/NavigationController/NavigationController";
import SearchResultsView from "./ui/components/SearchResultsView/SearchResultsView";
import ShareLinkDialog from "./ui/components/ShareLink/ShareLinkDialog";
import View from "./ui/View";
import LZString = require("lz-string");
const deepEqual = require('fast-deep-equal');

// telemetry
// add mixpanel to the global context, this is a bit of a hack but it's the usual mixpanel pattern
(window as any).mixpanel = require('mixpanel-browser');

type Props = {
	apiBaseUrl: string
}

type State = {
	views: Array<View>,

	headerHeight: number;
	viewerWidth: number;
	viewerHeight: number;

	displayErrorDialog: boolean,
	errors: Array<any>,

	displayShareDialog: boolean,

	userProfile: null | any,

	sidebarVisible: boolean,

	appReady: boolean,
}

enum SidebarViewType {
	None = 0,
	EntityDetails = 1,
	SearchResults = 2,
}

// Persistent app state field names are minified to reduce json size
type PersistentAppState = {
	genomeBrowser: GenomeBrowserConfiguration,
	sidebar: {
		viewType: SidebarViewType,
		title?: string,
		viewProps?: any,
	}
}

export class App extends React.Component<Props, State> implements Persistable<PersistentAppState> {

	readonly headerHeight: number = 56;
	readonly headerMargin: number = 20;

	protected appModel: AppModel;
	protected viewModel: ViewModel;

	protected headerRef: Header;
	protected genomeBrowser: GenomeBrowser;

	protected _currentPersistentState: PersistentAppState;

	constructor(props: Props) {
		super(props);

		if (App.appInstance != null) {
			console.error('Multiple instances of App are not allowed');
			return;
		}

		App.appInstance = this;

		// initialize telemetry
		mixpanel.init("641d46068eb631cfc8ba590288fe4679");

		// initialize app model
		this.appModel = new AppModel();
		this.viewModel = new ViewModel();
		this.appModel.setViewModel(this.viewModel);

		this.genomeBrowser = new GenomeBrowser({
			panels: [ { location: { contig: 'chr1', x0: 0, x1: 249e6 } } ],
			tracks: [ { model: { name: 'GRCh38', type: 'sequence' }, heightPx: 100 } ],
		});

		this.state = {
			views: [],
			headerHeight: this.headerHeight,
			viewerWidth: window.innerWidth,
			viewerHeight: this.canvasHeight(),
			displayErrorDialog: false,
			errors: [],
			displayShareDialog: false,
			userProfile: null,
			sidebarVisible: false,
			appReady: false,
		};
	}

	getPersistentState(): PersistentAppState {
		// default to no sidebar view open
		let currentSidebarView: PersistentAppState['sidebar'] = {
			viewType: SidebarViewType.None,
		}

		let lastView = this.state.views[this.state.views.length - 1];
		if (this.state.sidebarVisible && lastView != null) {
			let lastReactView = lastView.view;

			if (lastReactView != null && (lastReactView as any).type != null) {
				let type = (lastReactView as any).type;
				currentSidebarView.title = lastView.title;

				if (type === EntityDetails) {
					currentSidebarView.viewType = SidebarViewType.EntityDetails;
					currentSidebarView.viewProps = (lastReactView as React.ReactElement<any>).props.entity;
				} else if (type === SearchResultsView) {
					currentSidebarView.viewType = SidebarViewType.SearchResults;
					currentSidebarView.viewProps = {
						q: lastView.info, // search query object
						t: (lastReactView as SearchResultsView).props.text
					}
					// token box state
					if (this.headerRef != null) {
						currentSidebarView.viewProps.h = this.headerRef.getTokenBoxState();
					}
				}
			}
		}

		return {
			genomeBrowser: this.genomeBrowser.getConfiguration(),
			sidebar: currentSidebarView
		}
	}

	setPersistentState(state: PersistentAppState) {
		this.genomeBrowser.setConfiguration(state.genomeBrowser);
		let viewProps = state.sidebar.viewProps;
		switch (state.sidebar.viewType) {
			case SidebarViewType.None: {
				break;
			}
			case SidebarViewType.EntityDetails: {
				this.displayEntityDetails(viewProps);
				break;
			}
			case SidebarViewType.SearchResults: {
				this.displaySearchResults(viewProps.q, viewProps.t);
				// set TokenBox state
				if ((viewProps.h != null) && (this.headerRef != null)) {
					this.headerRef.setTokenBoxState(viewProps.h);
				}
				break;
			}
		}
	}

	componentDidMount() {
		// add event listeners
		window.addEventListener('resize', this.onResize);
		// handle browser back to a previously pushed state
		window.addEventListener('popstate', this.onPopState);

		this.appModel.addListener(this.reportFailure, AppEvent.Failure);
		this.appModel.addListener(this.trackMixPanel, AppEvent.TrackMixPanel);
		this.viewModel.addListener(this.onPushView, ViewEvent.PUSH_VIEW);
		this.viewModel.addListener(this.onPopView, ViewEvent.POP_VIEW);
		this.viewModel.addListener(this.onShowView, ViewEvent.SHOW_VIEW);
		this.viewModel.addListener(this.onCloseView, ViewEvent.CLOSE_VIEW);

		// Get User Profile, redirect if not logged in
		// @! this isn't a good way to handle login – it causes a number of problems
		// should be handled server-side instead
		SiriusApi.getUserProfile().then((userProfile: any) => {
			if (!userProfile.name) {
				window.location.href = '/login';
			}
			// assign identity of mixpanel
			mixpanel.identify(userProfile.name);
			mixpanel.people.set({
				"$email": userProfile.name,
				"$last_login": new Date(),
			});
			this.setState({
				userProfile: userProfile,
				appReady: true,
			})
		}, (err: object) => {
			window.location.href = '/login';
		});
	}

	componentWillUnmount() {
		this.stopFrameLoop();

		// remove event listeners
		window.removeEventListener('resize', this.onResize);
		window.removeEventListener('popstate', this.onPopState);

		this.appModel.removeListener(this.reportFailure);
		this.appModel.removeListener(this.trackMixPanel);
		this.viewModel.removeListener(this.onPushView);
		this.viewModel.removeListener(this.onPopView);
		this.viewModel.removeListener(this.onShowView);
		this.viewModel.removeListener(this.onCloseView);

		// release shared resources
		SharedTileStore.clearAll();
	}

	componentDidUpdate(prevProps: Props, prevState: State, snapshot: any) {
		if (!prevState.appReady && this.state.appReady) {
			this.onMainAppReady();
		}
	}

	onMainAppReady() {
		// on persistent state changed
		// get app state from URL
		if (AppStatePersistence.hasStateInUrl()) {
			try {
				this.setPersistentState(AppStatePersistence.parseUrlStateObject(window.location));
			} catch (e) {
				console.warn(`State url is invalid: ${e}`);
			}
		}

		this._currentPersistentState = this.getPersistentState();

		// set initial history state
		history.replaceState(this._currentPersistentState, document.title);

		// We only start the FrameLoop after log in
		this.startFrameLoop();
	}

	render() {
		if (this.state.userProfile === null) {
			return (<div className="centered">
						<CircularProgress size={150} thickness={10} />
					</div>);
		}

		const errorButton = this.state.errors.length > 0 ? (
				<IconButton onClick={this.displayErrors} tooltip="Errors" tooltipPosition="top-center">
					<ContentReport />
				</IconButton>
			) :
			(<div />);

		let errorDialog = (<div />);
		if (this.state.errors.length) {
			let id = 0;
			const errorList = this.state.errors.map((error: object) => {
				return (<div key={'error' + (++id)}>{JSON.stringify(error)}<hr /></div>);
			});

			const actions = [<FlatButton
				label="Cancel"
				primary={true}
				onClick={this.hideErrors}
			/>];

			errorDialog = (<Dialog
				title="Errors"
				modal={false}
				open={this.state.displayErrorDialog}
				onRequestClose={this.hideErrors}
				autoScrollBodyContent={true}
				actions={actions}
			>
				{errorList}
			</Dialog>);
		}

		const shareLink = window.location.href;

		return (
				<div>
					<Header
						viewModel={this.viewModel}
						appModel={this.appModel}
						userProfile={this.state.userProfile}
						onShowShare={() => this.setState({ displayShareDialog: true })}
						ref={(v) => this.headerRef = v}
					/>

					{this.genomeBrowser.render({
						width: this.state.viewerWidth,
						height: this.state.viewerHeight,
						pixelRatio: App.canvasPixelRatio,
						style: {
							display: 'inline-block',
							marginTop: this.headerMargin + 'px',
						}
					})}

					<NavigationController
						viewModel={this.viewModel}
						views={this.state.views}
						visible={this.state.sidebarVisible}
						style={{
							top: this.headerHeight + 'px',
							bottom: '0px',
							height: 'auto',
						}}
					/>

					{errorDialog}
					<ShareLinkDialog
						shareLink={shareLink}
						open={this.state.displayShareDialog}
						handleClose={() => this.setState({displayShareDialog: false})}
					/>

					<div className="page-buttons">
						{errorButton}
					</div>
				</div>
		);
	}

	private _frameLoopHandle: number = 0;
	private _lastFrameT_ms = 0;
	protected startFrameLoop() {
		if (this._frameLoopHandle === 0) {
			this.frameLoop();

		}
	}

	protected stopFrameLoop() {
		window.cancelAnimationFrame(this._frameLoopHandle);
		this._frameLoopHandle = 0;
	}

	protected _lastStateChangeT_ms = -Infinity;
	protected _urlStateNeedsUpdate = false;
	protected frameLoop = () => {
		this._frameLoopHandle = window.requestAnimationFrame(this.frameLoop);

		let t_ms = window.performance.now();
		let dt_ms = t_ms - this._lastFrameT_ms;
		this._lastFrameT_ms = t_ms;

		// ~0.001ms
		// manage writing persistent state to the url
		// if the persistent state hasn't changed for some time then update the url
		let latestState = this.getPersistentState();
		if (!deepEqual(latestState, this._currentPersistentState)) {
			this._currentPersistentState = latestState;
			this._lastStateChangeT_ms = t_ms;
			this._urlStateNeedsUpdate = true;
		} else if (this._urlStateNeedsUpdate) {
			let timeWithoutStateChange_ms = (t_ms - this._lastStateChangeT_ms);
			if (timeWithoutStateChange_ms > 100) {
				AppStatePersistence.writePersistentUrlState(this._currentPersistentState);
				this._urlStateNeedsUpdate = false;
			}
		}
	}

	protected canvasHeight() {
		return window.innerHeight - this.headerHeight - this.headerMargin;
	}

	// event handling

	protected onResize = () => {
		this.setState({
			viewerWidth: window.innerWidth,
			viewerHeight: this.canvasHeight(),
		});
	}

	protected onPopState = (e: PopStateEvent) => {
		if (e.state != null) {
			this.setPersistentState(e.state);
		} else {
			console.warn('onPopState(): history state was null', e);
		}
	}

	protected onPushView = (e: {data: View}) => {
		this.setState({ views: this.state.views.concat([e.data]) });
	}

	protected onPopView = () => {
		this.setState({ views: this.state.views.slice(0, -1) });
	}

	protected onShowView = () => {
		this.setState({sidebarVisible: true});
	}

	protected onCloseView = () => {
		this.setState({ sidebarVisible: false });
	}

	protected displayRegion(contig: string, startBase: number, endBase: number) {
		let startIndex = startBase - 1;
		let endIndex = endBase;

		for (let panel of this.genomeBrowser.getPanels()) {
			if (panel.column === 0) {
				panel.setContig(contig);
				panel.setRange(startIndex, endIndex);
				break;
			}
		}
	}

	protected displayEntityDetails(entity: { id: string, type: EntityType }) {
		this.viewModel.pushView(
			'',
			entity.id,
			<EntityDetails entity={entity} appModel={this.appModel} viewModel={this.viewModel} />
		);
	}

	protected _searchIncrementalId = 0;
	protected displaySearchResults(query: any, text: string = 'Search') {
		const uid = `search-result-#${this._searchIncrementalId++}`;
		const view = (<SearchResultsView key={uid} text={text} query={query} viewModel={this.viewModel} appModel={this.appModel}/>);
		this.viewModel.pushView('Search Results', query, view);
	}

	protected displayErrors = () => {
		this.setState({displayErrorDialog: true});
	}

	protected hideErrors = () => {
		this.setState({ displayErrorDialog: false });
	}

	protected reportFailure = (evt: any) => {
		const error: object = evt.data.error;
		const newErrorList = this.state.errors.slice(0);
		newErrorList.push(error);
		this.setState({
			errors: newErrorList,
		});
	}

	protected trackMixPanel = (event: any) => {
		if (event.data !== null) {
			// skip tracking for dev account
			const uProf = this.state.userProfile;
			if (uProf && uProf.user_id) {
				const msg: string = event.data.msg;
				const details: any = event.data.details;
				mixpanel.track(msg, details);
			}
		}
	}

	protected addTrack(model: TrackModel) {
		this.genomeBrowser.addTrack(model, undefined, true);
	}

	protected addVariantTrack(title: string, query: any) {
		this.addTrack({
			type: 'variant',
			name: title,
			query: query
		});
	}

	protected addIntervalTrack(
		title: string,
		query: any,
		blendEnabled?: boolean
	) {
		if (blendEnabled === undefined) blendEnabled = true;
		this.addTrack({
			name: title,
			type: 'interval',
			tileStoreType: 'interval',
			query: query,
			blendEnabled: blendEnabled
		});
	}

	protected getQueryTracks() : Map<string, any> {
		let tracks = this.genomeBrowser.getTracks();

		let ret = new Map<string, any>();

		for (let track of tracks) {
			let name = null;
			let query = null;
			const type = track.model.type;
			if (type === 'interval') {
				name = (track.model as TrackModel<'interval'>).name;
				query = (track.model as TrackModel<'interval'>).query;
			} else if (type === 'variant') {
				name = (track.model as TrackModel<'variant'>).name;
				query = (track.model as TrackModel<'variant'>).query;
			}
			if (query && name) {
				ret.set(name, { query: JSON.parse(JSON.stringify(query)), type: type });
			}
		}

		return ret;
	}
 
	// global app methods, assumes a single instance of App
	static readonly canvasPixelRatio = window.devicePixelRatio || 1;

	private static appInstance: App;

	static getQueryTracks() : Map<string, any> {
		return this.appInstance.getQueryTracks();
	}
	static displayRegion(contig: string, startBase: number, endBase: number) {
		this.appInstance.displayRegion(contig, startBase, endBase);
	}

	static addTrack(model: TrackModel) {
		this.appInstance.addTrack(model);
	}

	static addVariantTrack(title: string, query: any) {
		this.appInstance.addVariantTrack(title, query);
	}

	static addIntervalTrack(
		title: string,
		query: any,
		blendEnabled?: boolean,
	) {
		this.appInstance.addIntervalTrack(title, query, blendEnabled);
	}

	static displayEntityDetails(entity: { id: string, type: EntityType }) {
		this.appInstance.displayEntityDetails(entity);
	}

	static displaySearchResults(query: any, text: string = 'Search') {
		this.appInstance.displaySearchResults(query, text);
	}

}

// A minified version of PersistentAppState
type MinifiedAppState = [
	/** genomeBrowser */
	[
		/** panels */
		Array<[
			/** contig */
			string,
			/** x0 */
			number,
			/** x1 */
			number,
			/** width */
			number | undefined
		]>,
		/** tracks */
		Array<[
			/** model */
			TrackModel,
			/** heightPx */
			number | undefined
		]>
	],
	/** sidebar */
	[
		/** viewType */
		SidebarViewType,
		/** title */
		string | undefined,
		/** viewProps */
		any | undefined
	] 
];

class AppStatePersistence {

	static hasStateInUrl() {
		return !!window.location.hash;
	}

	static writePersistentUrlState(stateObject: PersistentAppState) {
		let stateUrl = '#' + this.serializePersistentState(stateObject);
		history.replaceState(stateObject, document.title, stateUrl);
	}

	/**
	 * @throws string on invalid state url
	 */
	static parseUrlStateObject(url: { hash: string }): any {
		let stateString = url.hash.substring(1);
		return this.deserializePersistentState(stateString);
	}

	static serializePersistentState(state: PersistentAppState): string {
		let minifiedState: MinifiedAppState = [
			this.minifyGenomeBrowserState(state.genomeBrowser),
			this.minifySidebarState(state.sidebar)
		];

		let jsonString = JSON.stringify(minifiedState);
		let compressedString = LZString.compressToBase64(jsonString);

		return compressedString;
	}

	/**
	 * @throws string on invalid serialized data
	 */
	static deserializePersistentState(serialized: string): PersistentAppState {
		let jsonString = LZString.decompressFromBase64(serialized);
		if (jsonString == null) {
			throw `Invalid state string - could not decompress`;
		}

		let minifiedState: MinifiedAppState = JSON.parse(jsonString);

		let expandedState: PersistentAppState = {
			genomeBrowser: this.expandGenomeBrowserState(minifiedState[0]),
			sidebar: this.expandSidebarState(minifiedState[1])
		};

		return expandedState;
	}

	private static minifyGenomeBrowserState(state: PersistentAppState['genomeBrowser']): MinifiedAppState[0] {
		let minifiedPanels: MinifiedAppState[0][0] = new Array();
		for (let panel of state.panels) {
			minifiedPanels.push([
				panel.location.contig,
				panel.location.x0,
				panel.location.x1,
				panel.width
			]);
		}

		let minifiedTracks: MinifiedAppState[0][1] = new Array();
		for (let track of state.tracks) {
			minifiedTracks.push([
				track.model,
				track.heightPx
			]);
		}

		return [
			minifiedPanels,
			minifiedTracks,
		];
	}

	private static expandGenomeBrowserState(min: MinifiedAppState[0]): PersistentAppState['genomeBrowser'] {
		let minPanels = min[0];
		let minTracks = min[1];

		let panels: PersistentAppState['genomeBrowser']['panels'] = new Array();

		for (let minPanel of minPanels) {
			panels.push({
				location: {
					contig: minPanel[0],
					x0: minPanel[1],
					x1: minPanel[2],
				},
				width: minPanel[3],
			});
		}

		let tracks: PersistentAppState['genomeBrowser']['tracks'] = new Array();

		for (let minTrack of minTracks) {
			tracks.push({
				model: minTrack[0],
				heightPx: minTrack[1],
			});
		}

		return {
			panels: panels,
			tracks: tracks,
		};
	}

	private static minifySidebarState(state: PersistentAppState['sidebar']): MinifiedAppState[1] {
		return [
			state.viewType,
			state.title,
			state.viewProps,
		];
	}

	private static expandSidebarState(min: MinifiedAppState[1]): PersistentAppState['sidebar'] {
		return {
			viewType: min[0],
			title: min[1],
			viewProps: min[2]
		};
	}

}

export default App;