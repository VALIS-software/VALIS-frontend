import { Strand } from 'valis';
import { Dialog, FlatButton, IconButton, Snackbar } from "material-ui";
import CircularProgress from "material-ui/CircularProgress";
import { MuiThemeProvider } from "material-ui/styles";
import { ContentReport, SocialShare } from "material-ui/svg-icons";
import * as React from "react";
import { SiriusApi, EntityType } from 'valis';
import Animator from "./animation/Animator";
// styles
import "./App.scss";
import { SharedTileStore } from "./model/data-store/SharedTileStores";
import Persistable from "./model/Persistable";
import { TrackModel } from "./model/TrackModel";
import { EntityDetails } from "./ui/components/EntityDetails/EntityDetails";
import Header from "./ui/components/Header/Header";
import NavigationController from "./ui/components/NavigationController/NavigationController";
import SearchResultsView from "./ui/components/SearchResultsView/SearchResultsView";
import ShareLinkDialog from "./ui/components/ShareLink/ShareLinkDialog";
import { AppCanvas } from "./ui/core/AppCanvas";
import AppModel, { AppEvent } from "./ui/models/AppModel";
import ViewModel, { ViewEvent } from "./ui/models/ViewModel";
import BasicTheme from "./ui/themes/BasicTheme";
import TrackViewer, { PersistentTrackViewerState } from "./ui/TrackViewer";
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

	trackViewer: TrackViewer;

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
	/** TrackViewer state */
	t: PersistentTrackViewerState,
	/** Sidebar view state */
	s: {
		/** Sidebar view type */
		t: SidebarViewType,
		/** Sidebar view */
		h?: string,
		/** Sidebar view props */
		p?: any,
	}
}

export class App extends React.Component<Props, State> implements Persistable<PersistentAppState> {

	readonly headerHeight: number = 56;
	readonly headerMargin: number = 20;

	protected appModel: AppModel;
	protected viewModel: ViewModel;
	protected appCanvas: AppCanvas;
	protected trackViewer: TrackViewer;

	protected headerRef: Header;

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

		// initialize UI
		this.trackViewer = new TrackViewer();
		this.trackViewer.setAppModel(this.appModel);

		// initialize with some dummy data
		let tracks: Array<TrackModel> = [
			{ name: 'GRCh38', type: 'sequence' },
			{ name: 'Variants', type: 'variant'},
			{ name: '→ Strand Genes', type: 'annotation', strand: Strand.Positive },
			{ name: '← Strand Genes', type: 'annotation', strand: Strand.Negative },
		];
		let i = 0;
		for (let model of tracks) {
			this.trackViewer.addTrackRow(model, undefined, false);
		}

		for (let panel of [
			{ contig: 'chr1', x0: 0, x1: 249e6 }
		]) {
			this.trackViewer.addPanel(panel, false);
		}

		this.state = {
			views: [],
			headerHeight: this.headerHeight,
			viewerWidth: window.innerWidth,
			viewerHeight: this.canvasHeight(),
			trackViewer: this.trackViewer,
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
		let currentSidebarView: PersistentAppState['s'] = {
			t: SidebarViewType.None,
		}

		let lastView = this.state.views[this.state.views.length - 1];
		if (this.state.sidebarVisible && lastView != null) {
			let lastReactView = lastView.view;

			if (lastReactView != null && (lastReactView as any).type != null) {
				let type = (lastReactView as any).type;
				currentSidebarView.h = lastView.title;

				if (type === EntityDetails) {
					currentSidebarView.t = SidebarViewType.EntityDetails;
					currentSidebarView.p = (lastReactView as React.ReactElement<any>).props.entity;
				} else if (type === SearchResultsView) {
					currentSidebarView.t = SidebarViewType.SearchResults;
					currentSidebarView.p = {
						q: lastView.info, // search query object
						t: (lastReactView as SearchResultsView).props.text
					}
					// token box state
					if (this.headerRef != null) {
						currentSidebarView.p.h = this.headerRef.getTokenBoxState();
					}
				}
			}
		}

		return {
			t: this.trackViewer.getPersistentState(),
			s: currentSidebarView
		}
	}

	setPersistentState(state: PersistentAppState) {
		this.trackViewer.setPersistentState(state.t);
		let viewProps = state.s.p;
		switch (state.s.t) {
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
		// We only start the FrameLoop after log in
		this.startFrameLoop();

		// on persistent state changed
		// get app state from URL
		if (this.hasStateInUrl()) {
			try {
				this.setPersistentState(this.getStateObject(window.location));
			} catch (e) {
				console.warn(`State url is invalid: ${e}`);
			}
		}

		this._currentPersistentState = this.getPersistentState();

		// set initial history state
		history.replaceState(this._currentPersistentState, document.title);
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
			<MuiThemeProvider muiTheme={BasicTheme}>
				<div>
					<Header
						viewModel={this.viewModel}
						appModel={this.appModel}
						userProfile={this.state.userProfile}
						onShowShare={() => this.setState({ displayShareDialog: true })}
						ref={(v) => this.headerRef = v}
					/>
					<AppCanvas
						ref={(v) => this.appCanvas = v}
						width={this.state.viewerWidth}
						height={this.state.viewerHeight}
						content={this.state.trackViewer}
						pixelRatio={App.canvasPixelRatio}
						style={{
							display: 'inline-block',
							marginTop: this.headerMargin + 'px',
						}}
					/>

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
			</MuiThemeProvider>
		);
	}

	private _frameLoopHandle: number;
	private _lastFrameT_ms = 0;
	protected startFrameLoop() {
		this._lastFrameT_ms = window.performance.now();
		this.frameLoop();
	}

	protected stopFrameLoop() {
		window.cancelAnimationFrame(this._frameLoopHandle);
	}

	protected _lastStateChangeT_ms = -Infinity;
	protected _urlStateNeedsUpdate = false;
	protected frameLoop = () => {
		this._frameLoopHandle = window.requestAnimationFrame(this.frameLoop);

		let t_ms = window.performance.now();
		let dt_ms = t_ms - this._lastFrameT_ms;
		this._lastFrameT_ms = t_ms;

		// appCanvas should react to user input before animation are stepped
		// this enables any animations spawned by the interaction events to be progressed before rendering
		this.appCanvas.handleUserInteraction();

		Animator.step();

		this.appCanvas.renderCanvas();
		
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
				this.writePersistentUrlState(this._currentPersistentState);
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

		let panel0 = this.state.trackViewer.getPanel(0);
		if (panel0 == null) return;
		panel0.setContig(contig);
		panel0.setRange(startIndex, endIndex);
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
		this.state.trackViewer.addTrackRow(model);
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
		return this.state.trackViewer.getQueryRows();
	}

	protected writePersistentUrlState(stateObject: PersistentAppState) {
		let originalString = JSON.stringify(stateObject);
		let stateUrl = '#' + LZString.compressToBase64(originalString);
		// @! replace with pushState for back/forward support (this requires some extra work to get right)
		history.replaceState(stateObject, document.title, stateUrl);
	}

	protected hasStateInUrl() {
		return !!window.location.hash;
	}
	/**
	 * @throws string
	 */
	protected getStateObject(url: { hash: string }): any {
		let stateString = url.hash.substring(1);
		let jsonString = LZString.decompressFromBase64(stateString);
		if (jsonString == null) {
			throw `Invalid state string`;
		}
		return JSON.parse(LZString.decompressFromBase64(stateString));	
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

export default App;