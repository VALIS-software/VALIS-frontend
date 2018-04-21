import * as React from "react";
import { AppCanvas } from "./ui/core/AppCanvas";
import Object2D from "./ui/core/Object2D";
import TrackViewer from "./ui/TrackViewer";
import Animator from "./animation/Animator";
import Header from "./ui/components/header/Header";

interface Props {}

interface State {
	headerHeight: number;
	viewerWidth: number;
	viewerHeight: number;

	canvasContent: Object2D;
}

export class App extends React.Component<Props, State> {

	readonly headerHeight: number = 50;
	readonly headerMargin: number = 30;
	protected appCanvas: AppCanvas;

	constructor(props: Props) {
		super(props);

		let trackViewer = new TrackViewer();
		
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

		// handle user input
		// this.appCanvas.*mouseEvents(...)
		// canvas.style.cursor = ...
		// convert mouse coordinates into clip-space for bounds checking
		// step animation
		Animator.step();

		// -- scene graph must not change after this point --
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