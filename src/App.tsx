import * as React from "react";
import { Strand } from "../lib/gff3/Strand";
import Animator from "./animation/Animator";
import AnnotationTileStore, { MacroAnnotationTileStore } from "./model/data-store/AnnotationTileStore";
import SequenceTileStore from "./model/data-store/SequenceTileStore";
import SharedTileStore from "./model/data-store/SharedTileStores";
import { TrackModel } from "./model/TrackModel";
import { AppCanvas } from "./ui/core/AppCanvas";
import Object2D from "./ui/core/Object2D";
import TrackViewer from "./ui/TrackViewer";
import Header from "./ui/components/Header/Header";
import View from "./ui/View";
import AppModel, { AppEvent } from "./ui/models/AppModel";
import ViewModel, { VIEW_EVENT_POP_VIEW, VIEW_EVENT_PUSH_VIEW, VIEW_EVENT_CLOSE_VIEW, VIEW_EVENT_DISPLAY_ENTITY_DETAILS, VIEW_EVENT_DISPLAY_TRACK_RESULTS } from "./ui/models/viewModel";
import NavigationController from "./ui/components/NavigationController/NavigationController";
import { MuiThemeProvider } from "material-ui/styles";
import BasicTheme from "./ui/themes/BasicTheme";
import { EntityDetails } from "./ui/components/EntityDetails/EntityDetails";
import { IconButton, FlatButton, Dialog } from "material-ui";
import { ContentReport } from "material-ui/svg-icons";

import SearchResultsView from "./ui/components/SearchResultsView/SearchResultsView";
import { QueryParser, buildQueryParser } from './ui/helpers/queryparser';

// styles
import "./App.scss";

// telemetry
// add mixpanel to the global context, this is a bit of a hack but it's the usual mixpanel pattern
(window as any).mixpanel = require('mixpanel-browser')

function parseText(text: string): any {
	const geneSuggestions = (text: string, maxResults: number) => {
		return new Promise((resolve, reject) => {
			resolve(['MAOA', 'MAOB', 'PCSK9', 'NF2']);
		})
	};
	const traitSuggestions = (text: string, maxResults: number) => {
		return new Promise((resolve, reject) => {
			resolve(['Cancer', 'Alzheimers', 'Depression']);
		})
	}

	const suggestions = new Map();
	suggestions.set('GENE', geneSuggestions);
	suggestions.set('TRAIT', traitSuggestions);
	const parser: QueryParser = buildQueryParser(suggestions);
	return parser.getSuggestions(text);
}

type Props = {}

type State = {
	views: Array<View>,

	headerHeight: number;
	viewerWidth: number;
	viewerHeight: number;

	canvasContent: Object2D;

	displayErrors: boolean,
	errors: Array<any>,

	userProfile: null | any,
}

export class App extends React.Component<Props, State> {
	static readonly canvasPixelRatio = window.devicePixelRatio || 1;

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

		// initialize UI
		let trackViewer = new TrackViewer();

		// @! temporary create tile stores
		SharedTileStore['sequence']['chromosome1'] = new SequenceTileStore('chromosome1');
		SharedTileStore['annotation']['chromosome1'] = new AnnotationTileStore('chromosome1');
		SharedTileStore['macroAnnotation']['chromosome1'] = new MacroAnnotationTileStore('chromosome1');

		// @! temporary preload lods
		SharedTileStore['sequence']['chromosome1'].getTiles(0.9, 1.1e6, 1 << 12, true, () => {});
		SharedTileStore['sequence']['chromosome1'].getTiles(0.95, 1.05e6, 1 << 8, true, () => {});
		SharedTileStore['sequence']['chromosome1'].getTiles(0, 230e6, 1 << 23, true, () => {});

		// initialize with some dummy data
		let tracks: Array<TrackModel> = [
			{ sequenceId: 'chromosome1', name: '→ Sequence', type: 'sequence' },
			{ sequenceId: 'chromosome1', name: '→ Strand Genes', type: 'annotation', strand: Strand.Positive },
			{ sequenceId: 'chromosome1', name: '← Strand Genes', type: 'annotation', strand: Strand.Negative },
		];
		let i = 0;
		for (let model of tracks) {
			let h = undefined;
			// @! quick hack some initial layout
			if (i === 0) h = 100;
			if (i === 1) h = Math.max((this.canvasHeight() - 200) * 0.5, 0);
			if (i === 2) h = Math.max((this.canvasHeight() - 200) * 0.5, 0);
			trackViewer.addTrackRow(model, h);
			i++;
		}

		for (let panel of [
			// { name: 'Chromosome 1', x0: 1358.4e3, x1: 1358.6e3}
			{ name: 'Chromosome 1', x0: 0, x1: 249e6 }
		]) {
			trackViewer.addPanel(panel, false);
		}
		
		this.state = {
			views: [],
			headerHeight: this.headerHeight,
			viewerWidth: window.innerWidth,
			viewerHeight: this.canvasHeight(),
			canvasContent: trackViewer,
			displayErrors: false,
			errors: [],
			userProfile: null,
		};
	}

	componentDidMount() {
		this.startFrameLoop();

		// Get User Profile, redirect if not logged in
		this.appModel.api.getUserProfile().then((userProfile: any) => {
			if (!userProfile.name) {
				window.location.href = '/login';
			}
			this.setState({
				userProfile: userProfile,
			})
		}, (err: object) => {
			window.location.href = '/login';
		});

		// add event listeners
		window.addEventListener('resize', this.onResize);

		// @! refactor todo
		this.appModel.addListener(this.reportFailure, AppEvent.Failure);
		this.appModel.addListener(this.trackMixPanel, AppEvent.TrackMixPanel);
		// this.appModel.addListener(this.updateLoadingState, AppEvent.LoadingStateChanged);

		this.viewModel.addListener(this.pushView, VIEW_EVENT_PUSH_VIEW);
		this.viewModel.addListener(this.popView, VIEW_EVENT_POP_VIEW);
		this.viewModel.addListener(this.closeView, VIEW_EVENT_CLOSE_VIEW);
		this.viewModel.addListener(this.displayDetails, VIEW_EVENT_DISPLAY_ENTITY_DETAILS);
		this.viewModel.addListener(this.displayTrackSearchResults, VIEW_EVENT_DISPLAY_TRACK_RESULTS);
		// this.viewModel.addListener(this.clickTrackElement, VIEW_EVENT_TRACK_ELEMENT_CLICKED);
		// this.viewModel.addListener(this.showTrackSettings, VIEW_EVENT_EDIT_TRACK_VIEW_SETTINGS);
	}

	componentWillUnmount() {
		this.stopFrameLoop();

		// remove event listeners
		window.removeEventListener('resize', this.onResize);
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
					<Header viewModel={this.viewModel} model={this.appModel} userProfile={this.state.userProfile} />
					<AppCanvas
						ref={(v) => this.appCanvas = v}
						width={this.state.viewerWidth}
						height={this.state.viewerHeight} 
						content={this.state.canvasContent}
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

	protected displayDetails = (event: {data: any}) => {
		if (event.data != null) {
			this.viewModel.pushView(
				'',
				event.data.id,
				<EntityDetails entity={event.data} appModel={this.appModel} viewModel={this.viewModel} />
			);
		}
	}

   protected displayTrackSearchResults = (event: any) => {
     if (event.data !== null) {
       const trackGuid: string = event.data;
       const view = (<SearchResultsView trackGuid={trackGuid} viewModel={this.viewModel} appModel={this.appModel} />);
       this.viewModel.pushView('Search Results', trackGuid, view);
     }
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

	trackMixPanel = (event: any) => {
		if (event.data !== null) {
			const msg: string = event.data.msg;
			const details: any = event.data.details;
			details.user = this.state.userProfile.name;
			mixpanel.track(msg, details);
		}
	}

}

export default App;