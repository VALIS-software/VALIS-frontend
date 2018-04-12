import * as React from "react";
import { AppCanvas } from "./AppCanvas";
import Object2D from "./ui/core/Object2D";
import TrackViewer from "./ui/TrackViewer";

interface Props {}

interface State {
	headerHeight: number;
	viewerWidth: number;
	viewerHeight: number;

	canvasContent: Object2D;
}

export class App extends React.Component<Props, State> {

	readonly headerHeight: number = 50;

	constructor(props: Props) {
		super(props);

		let trackViewer = new TrackViewer();
		
		this.state = {
			headerHeight: this.headerHeight,
			viewerWidth: window.innerWidth,
			viewerHeight: window.innerHeight - this.headerHeight,
			canvasContent: trackViewer
		};
	}

	componentDidMount() {
		window.addEventListener('resize', this.onResize);
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.onResize);
	}

	componentDidUpdate(prevProps: Props, prevState: State, snapshot: any) {
	}

	render() {
		return (<div>
			<header style={{height: this.state.headerHeight}}>Header</header>
			<AppCanvas
				width={this.state.viewerWidth}
				height={this.state.viewerHeight} 
				content={this.state.canvasContent}
			/>
		</div>)
	}

	protected onResize = () => {
		this.setState({
			viewerWidth: window.innerWidth,
			viewerHeight: window.innerHeight - this.headerHeight,
		});
	}

}

export default App;