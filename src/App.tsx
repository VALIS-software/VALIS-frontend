import * as React from "react";
import { AppCanvas } from "./ui/core/AppCanvas";
import Object2D from "./ui/core/Object2D";
import TrackViewer from "./ui/TrackViewer";
import Animator from "./animation/Animator";
import Header from "./ui/components/header/Header";
import { TrackType } from "./model/TrackDataModel";
import TileEngine from "./ui/tracks/TileEngine";

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

		// initialize with some dummy data
		let i = 0;
		for (let track of [
			{ sourceId: 'sequence', name: 'Sequence', type: TrackType.Sequence },
			{ sourceId: 'grch38', name: 'GRCh38', type: TrackType.Empty },
			{ sourceId: 'gm12878-dnase', name: 'GM12878-DNase', type: TrackType.Empty },
		]) {
			trackViewer.addTrackRow(track, i++ === 0 ? 100 : undefined);
		}

		for (let panel of [
			// { name: 'Chromosome 1', x0: 10e5, x1: 10e5 + 10 }
			{ name: 'Chromosome 1', x0: 0, x1: 249e6 }
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