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
		return (<div>
			<header style={{height: this.state.headerHeight}}>Header</header>
			<Viewer width={this.state.viewerWidth} height={this.state.viewerHeight} />
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