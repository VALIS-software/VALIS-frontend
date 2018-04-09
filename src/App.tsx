/*

	Viewer
	- All coordinates are set in DOM pixel units relative to the canvas (unless marked as otherwise)

	- DOM element node
		- Returns some sort of react object thingy : Contains a react component?
		- Extends Object2D with render false
		- applyTreeTransforms updates the dimensions of the react component
		! How do we know when to re-render?
			- We have some state field that has all the ReactNode components
		! How do we know when positions have changed?
			- Each frame we build the list of ReactNodes, comparing as we go

	- Split App into App and Viewer
	- Viewer height should be set by content / or fill rest of page height

	- Define a single track
	- Define a trackset / multiple track view
	- Define panel - a tracket with a header
	- Define viewer?, which is a set of panels with DOM column headers
		- Should have access to track rows since they'll be draggable in the future
	- Animate in new panels
	- Scene graph mouse events
*/

import * as React from "react";
import { Viewer } from "./Viewer";

interface Props {}

interface State {
	headerHeight: number;
	viewerWidth: number;
	viewerHeight: number;
}

export class App extends React.Component<Props, State> {

	readonly headerHeight: number = 50;

	constructor(props: Props) {
		super(props);
		
		this.state = {
			headerHeight: this.headerHeight,
			viewerWidth: window.innerWidth,
			viewerHeight: window.innerHeight - this.headerHeight
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
		const pixelRatio = window.devicePixelRatio || 1;

		return (<div>
			<header style={{height: this.state.headerHeight}}>Header</header>
			<Viewer width={this.state.viewerWidth} height={this.state.viewerHeight} />
		</div>)
	}

	protected onResize = () => {
		this.setState({
			viewerWidth: window.innerWidth,
			viewerHeight: window.innerHeight,
		});
	}

}

export default App;