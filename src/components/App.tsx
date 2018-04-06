/*

	- Create basic device methods
		- We don't need array references, we can just use IDs
	- device should not be a dependency
	- vertex-state allocation
		- may change between frames
		- can only be 1 vertex state at a given time
			- return?
			- set a local property?
	- renderable shaders should be changable
	- transform updates should be part of renderable but controlled by subclasses
		- Heirachy updates may do more than transform (ie, offset z) or some other parent-child transform
		- UpdateWorldTransform?
		- UpdateNode something/

*/

import * as React from "react";
import Node from '../rendering/Node';
import Device from '../rendering/Device';
import RenderPass from '../rendering/RenderPass';
import Object2D from '../rendering/Object2D';

interface Props {}

interface State {
	viewerWidth: number;
	viewerHeight: number;
}

export class App extends React.Component<Props, State> {

	protected viewer: HTMLElement;
	protected canvas: HTMLCanvasElement;
	protected device: Device;
	// protected renderer: Renderer;
	protected mainRenderPass: RenderPass;
	protected scene: Node<Object2D>;

	constructor(props: Props) {
		super(props);

		this.state = {
			viewerWidth: window.innerWidth,
			viewerHeight: window.innerHeight,
		}

		this.scene = new Node();
		this.mainRenderPass = new RenderPass(
			null,
			this.scene,
			{
				clearColor: [0, 0, 0, 1],
				clearDepth: 0
			}
		);
	}

	protected onResize = () => {
		this.setState({
			viewerWidth: window.innerWidth,
			viewerHeight: window.innerHeight,
		});
	}

	private _frameLoopHandle: number;
	protected frameLoop = () => {
		this._frameLoopHandle = window.requestAnimationFrame(this.frameLoop);

		// iterate scene, handle user input
			// canvas.style.cursor = ...
		// step animation
		// this.renderer.render(this.mainRenderPass);
	}

	componentDidMount() {
		let gl = this.canvas.getContext('webgl', { antialias: true });

		if (gl == null) {
			throw 'WebGL not supported';
		}

		this.device = new Device(gl);
		// this.renderer = new Renderer(this.device);

		window.addEventListener('resize', this.onResize);
		this.frameLoop();
	}

	componentWillUnmount() {
		window.removeEventListener('resize', this.onResize);
		window.cancelAnimationFrame(this._frameLoopHandle);
	}

	render() {
		const pixelRatio = window.devicePixelRatio || 1;

		return (<div>
			<header>Header</header>
			<div className="viewer" ref={(v) => this.viewer = v} style={{position: 'relative'}}>
				<canvas
					ref={(v) => this.canvas = v}
					width={this.state.viewerWidth * pixelRatio + 'px'}
					height={this.state.viewerHeight * pixelRatio + 'px'}
					style={{
						display: 'block',
						position: 'absolute',
						top: 0,
						left: 0,
						width: this.state.viewerWidth + 'px',
						height: this.state.viewerHeight + 'px',
						zIndex: 0
					}}
				/>
				<div className="overlay" style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%',
					zIndex: 1
				}}>
				</div>
			</div>
		</div>)
	}

}