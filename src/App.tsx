import * as React from "react";
import { Strand } from "../lib/gff3/Strand";
import Animator from "./animation/Animator";
import AnnotationTileStore from "./model/data-store/AnnotationTileStore";
import SequenceTileStore from "./model/data-store/SequenceTileStore";
import SharedTileStore from "./model/data-store/SharedTileStores";
import Header from "./ui/components/header/Header";
import { AppCanvas } from "./ui/core/AppCanvas";
import Object2D from "./ui/core/Object2D";
import TrackViewer from "./ui/TrackViewer";
import { TrackModel } from "./model/TrackModel";

interface Props {}

interface State {
	headerHeight: number;
	viewerWidth: number;
	viewerHeight: number;

	canvasContent: Object2D;
}

export class App extends React.Component<Props, State> {

	static readonly canvasPixelRatio = window.devicePixelRatio || 1;

	readonly headerHeight: number = 50;
	readonly headerMargin: number = 30;
	protected appCanvas: AppCanvas;

	constructor(props: Props) {
		super(props);

		let trackViewer = new TrackViewer();

		// @! temporary create tile stores
		SharedTileStore['sequence']['chromosome1'] = new SequenceTileStore('chromosome1');
		SharedTileStore['annotation']['chromosome1'] = new AnnotationTileStore('chromosome1');

		// @! temporary preload lods
		SharedTileStore['sequence']['chromosome1'].getTiles(0.9, 1.1e6, 1 << 12, true, () => {});
		SharedTileStore['sequence']['chromosome1'].getTiles(0.95, 1.05e6, 1 << 8, true, () => {});
		SharedTileStore['sequence']['chromosome1'].getTiles(0, 230e6, 1 << 23, true, () => {});

		// initialize with some dummy data
		let dummyTracks: Array<TrackModel> = [
			{ sequenceId: 'chromosome1', name: '+ Strand', type: 'sequence' },
			{ sequenceId: 'chromosome1', name: '+ Stand Genes', type: 'annotation', strand: Strand.Negative },
			{ sequenceId: 'chromosome1', name: '- Stand Genes', type: 'annotation', strand: Strand.Positive },
		];
		let i = 0;
		for (let model of dummyTracks) {
			let h = undefined;
			if (i === 0) h = 100;
			if (i === 1) h = 250;
			if (i === 2) h = 250;
			trackViewer.addTrackRow(model, h);
			i++;
		}

		for (let panel of [
			{ name: 'Chromosome 1', x0: 10e5, x1: 10e5 + 10 }
			// { name: 'Chromosome 1', x0: 0, x1: 249e6 }
		]) {
			trackViewer.addPanel(panel, false);
		}
		
		this.state = {
			headerHeight: this.headerHeight,
			viewerWidth: window.innerWidth,
			viewerHeight: this.canvasHeight(),
			canvasContent: trackViewer
		};
	}

	componentDidMount() {
		window.addEventListener('resize', this.onResize);
		this.startFrameLoop();
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.onResize);
		this.stopFrameLoop();
	}

	componentDidUpdate(prevProps: Props, prevState: State, snapshot: any) {
	}

	render() {
		return (<div>
			<Header marginBottom={this.headerMargin} height={this.headerHeight}/>
			<AppCanvas
				ref={(v) => this.appCanvas = v}
				width={this.state.viewerWidth}
				height={this.state.viewerHeight} 
				content={this.state.canvasContent}
				pixelRatio={App.canvasPixelRatio}
			/>
		</div>)
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

	protected onResize = () => {
		this.setState({
			viewerWidth: window.innerWidth,
			viewerHeight: this.canvasHeight(),
		});
	}

}

export default App;