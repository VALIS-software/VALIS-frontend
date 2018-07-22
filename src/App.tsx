import { Strand } from "gff3/Strand";
import { Dialog, FlatButton, IconButton } from "material-ui";
import { MuiThemeProvider } from "material-ui/styles";
import { ContentReport } from "material-ui/svg-icons";
import * as React from "react";
import EntityType from "sirius/EntityType";
import SiriusApi from "sirius/SiriusApi";
import Animator from "./animation/Animator";
// styles
import "./App.scss";
import { SharedTileStore } from "./model/data-store/SharedTileStores";
import { TrackModel } from "./model/TrackModel";
import { EntityDetails } from "./ui/components/EntityDetails/EntityDetails";
import Header from "./ui/components/Header/Header";
import NavigationController from "./ui/components/NavigationController/NavigationController";
import SearchResultsView from "./ui/components/SearchResultsView/SearchResultsView";
import { AppCanvas } from "./ui/core/AppCanvas";
import AppModel, { AppEvent } from "./ui/models/AppModel";
import QueryModel from "./ui/models/QueryModel";
import ViewModel, { ViewEvent } from "./ui/models/ViewModel";
import BasicTheme from "./ui/themes/BasicTheme";
import TrackViewer from "./ui/TrackViewer";
import View from "./ui/View";

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

	displayErrors: boolean,
	errors: Array<any>,

	userProfile: null | any,
}

export class App extends React.Component<Props, State> {

	readonly headerHeight: number = 50;
	readonly headerMargin: number = 30;

	protected appModel: AppModel;
	protected viewModel: ViewModel;
	protected appCanvas: AppCanvas;

	constructor(props: Props) {
		super(props);

		// initialize telemetry
		mixpanel.init("641d46068eb631cfc8ba590288fe4679");

		// initialize app model
		this.appModel = new AppModel();
		this.viewModel = new ViewModel();
		this.appModel.setViewModel(this.viewModel);

		// initialize UI
		let trackViewer = new TrackViewer();
		trackViewer.setAppModel(this.appModel);

		// initialize with some dummy data
		let tracks: Array<TrackModel> = [
			{ name: '→ Sequence', type: 'sequence' },
			{ name: 'Variants', type: 'variant'},
			{ name: '→ Strand Genes', type: 'annotation', strand: Strand.Positive },
			{ name: '← Strand Genes', type: 'annotation', strand: Strand.Negative },
		];
		let i = 0;
		for (let model of tracks) {
			trackViewer.addTrackRow(model, undefined, false);
		}

		for (let panel of [
			// { name: 'Chromosome 1', x0: 1358.4e3, x1: 1358.6e3}
			{ contig: 'chr1', x0: 0, x1: 249e6 }
		]) {
			trackViewer.addPanel(panel, false);
		}

		this.state = {
			views: [],
			headerHeight: this.headerHeight,
			viewerWidth: window.innerWidth,
			viewerHeight: this.canvasHeight(),
			trackViewer: trackViewer,
			displayErrors: false,
			errors: [],
			userProfile: null,
		};

		if (App.appInstance != null) {
			console.error('Multiple instances of App are not allowed');
		}

		App.appInstance = this;
	}

	componentDidMount() {
		this.startFrameLoop();

		// Get User Profile, redirect if not logged in
		// SiriusApi.getUserProfile().then((userProfile: any) => {
		// 	if (!userProfile.name) {
		// 		window.location.href = '/login';
		// 	}
		// 	// assign identity of mixpanel
		// 	mixpanel.identify(userProfile.name);
		// 	this.setState({
		// 		userProfile: userProfile,
		// 	})
		// }, (err: object) => {
		// 	window.location.href = '/login';
		// });

		// add event listeners
		window.addEventListener('resize', this.onResize);

		// @! refactor todo
		this.appModel.addListener(this.reportFailure, AppEvent.Failure);
		this.appModel.addListener(this.trackMixPanel, AppEvent.TrackMixPanel);
		// this.appModel.addListener(this.updateLoadingState, AppEvent.LoadingStateChanged);

		this.viewModel.addListener(this.pushView, ViewEvent.PUSH_VIEW);
		this.viewModel.addListener(this.popView, ViewEvent.POP_VIEW);
		this.viewModel.addListener(this.closeView, ViewEvent.CLOSE_VIEW);
		this.viewModel.addListener(
			(e: { data: { id: string, type: EntityType } }) => {
				if (e.data != null) this.displayDetails(e.data);
			},
			ViewEvent.DISPLAY_ENTITY_DETAILS
		);
		this.viewModel.addListener(
			(e: { data: string }) => {
				if (e.data !== null) this.displayTrackSearchResults(e.data);
			},
			ViewEvent.DISPLAY_TRACK_RESULTS
		);
		// this.viewModel.addListener(this.clickTrackElement, ViewEvent.TRACK_ELEMENT_CLICKED);
		// this.viewModel.addListener(this.showTrackSettings, ViewEvent.EDIT_TRACK_VIEW_SETTINGS);
	}

	componentWillUnmount() {
		this.stopFrameLoop();

		// remove event listeners
		window.removeEventListener('resize', this.onResize);

		// release shared resources
		SharedTileStore.clearAll();
	}

	componentDidUpdate(prevProps: Props, prevState: State, snapshot: any) {
	}

	render() {
		const errorButton = this.state.errors.length > 0 ? (<div className="error-button"><IconButton onClick={this.displayErrors} tooltip="Clear"><ContentReport /></IconButton></div>) : (<div />);

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
				open={this.state.displayErrors}
				onRequestClose={this.hideErrors}
				autoScrollBodyContent={true}
				actions={actions}
			>
				{errorList}
			</Dialog>);
		}

		return (
			<MuiThemeProvider muiTheme={BasicTheme}>
				<div>
					<Header viewModel={this.viewModel} appModel={this.appModel} userProfile={this.state.userProfile} />
					<AppCanvas
						ref={(v) => this.appCanvas = v}
						width={this.state.viewerWidth}
						height={this.state.viewerHeight}
						content={this.state.trackViewer}
						pixelRatio={App.canvasPixelRatio}
					/>
					<NavigationController viewModel={this.viewModel} views={this.state.views} />
					{errorButton}
					{errorDialog}
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

	protected pushView = (e: {data: View}) => {
		this.setState({ views: this.state.views.concat([e.data]) });
	}

	protected popView = () => {
		this.setState({ views: this.state.views.slice(0, -1) });
	}

	protected closeView = () => {
		this.setState({ views: [] });
	}

	protected displayRegion(contig: string, startBase: number, endBase: number) {
		let startIndex = startBase - 1;
		let endIndex = endBase;

		let panel0 = this.state.trackViewer.getPanel(0);
		if (panel0 == null) return;
		panel0.setContig(contig);
		panel0.setRange(startIndex, endIndex);
	}

	protected displayDetails(entity: { id: string, type: EntityType }) {
		this.viewModel.pushView(
			'',
			entity.id,
			<EntityDetails entity={entity} appModel={this.appModel} viewModel={this.viewModel} />
		);
	}

	protected displayTrackSearchResults = (trackGuid: string) => {
		const view = (<SearchResultsView trackGuid={trackGuid} viewModel={this.viewModel} appModel={this.appModel} />);
		this.viewModel.pushView('Search Results', trackGuid, view);
	}

	protected displayErrors = () => {
		this.setState({displayErrors: true});
	}

	protected hideErrors = () => {
		this.setState({ displayErrors: false });
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
			const msg: string = event.data.msg;
			const details: any = event.data.details;
			mixpanel.track(msg, details);
		}
	}

	protected addVariantTrack(title: string, query: any) {
		this.state.trackViewer.addTrackRow({
			type: 'variant',
			name: title,
			query: query
		});
	}

	protected _searchIncrementalId = 0;
	protected search(queryObject: any) {
		const queryModel = new QueryModel(queryObject);

		let title = 'Search';
		const uid = `search-result-#${this._searchIncrementalId++}`;
		const view = (<SearchResultsView key={uid} text={title} query={queryModel} viewModel={this.viewModel} appModel={this.appModel} />);

		this.appModel.trackMixPanel("Automated search", { 'queryStr': JSON.stringify(queryObject) });
		this.viewModel.pushView('Search Results', queryModel, view);
	}

	// global app methods, assumes a single instance of App
	static readonly canvasPixelRatio = window.devicePixelRatio || 1;

	private static appInstance: App;

	static displayRegion(contig: string, startBase: number, endBase: number) {
		this.appInstance.displayRegion(contig, startBase, endBase);
	}

	static addVariantTrack(title: string, query: any) {
		this.appInstance.addVariantTrack(title, query);
	}

	static search(queryObject: any) {
		this.appInstance.search(queryObject);
	}

}

export default App;
