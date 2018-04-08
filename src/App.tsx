/*
	- Aspect ratio and units
		- What coordinate system should we use?
		- Should we automatically handle aspect ratios?
			(Probably)
		- Ideas
			DOM pixel units:
				- What about inside a render target?
				- Could use a root Object2D
			Aspect-ratio clip-space, where h = 2 and w = r * 2

	- Define a single track
	- Define a trackset / multiple track view
	- Define panel - a tracket with a header
	- Define viewer?, which is a set of panels with DOM column headers
		- Should have access to track rows since they'll be draggable in the future
	- Animate in new panels
	- Scene graph mouse events
*/

import * as React from "react";
import Node from './rendering/Node';
import Device from './rendering/Device';
import RenderPass from './rendering/RenderPass';
import Object2D from './rendering/Object2D';
import Renderer from './rendering/Renderer';
import Renderable from './rendering/Renderable';
import SharedResources from './ui/core/SharedResources';
import Rect from './ui/core/Rect';

interface Props {}

interface State {
	viewerWidth: number;
	viewerHeight: number;
}

export class App extends React.Component<Props, State> {

	protected viewer: HTMLElement;
	protected canvas: HTMLCanvasElement;
	protected device: Device;
	protected renderer: Renderer;
	protected mainRenderPass: RenderPass;
	protected scene: Object2D;

	constructor(props: Props) {
		super(props);

		this.state = {
			viewerWidth: window.innerWidth,
			viewerHeight: window.innerHeight,
		}

		this.scene = new Object2D();

		let r = new Rect(1, 1);
		let g = new Rect(10, 10, [0, 1, 0, 1]);
		r.z = -0.1;
		this.scene.add(g);
		this.scene.add(r);

		this.mainRenderPass = new RenderPass(
			null,
			this.scene,
			{
				clearColor: [1, 1, 1, 1],
				clearDepth: 1
			}
		);
	}

	componentDidMount() {
		let gl = this.canvas.getContext('webgl', { antialias: true });

		if (gl == null) {
			throw 'WebGL not supported';
		}

		this.device = new Device(gl);
		this.renderer = new Renderer(this.device);
		SharedResources.initialize(this.device);
		this.scene.updateWorldTransforms(true);

		window.addEventListener('resize', this.onResize);
		this.frameLoop();
	}

	componentWillUnmount() {
		SharedResources.release();
		this.device = null;
		this.renderer = null;
		
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

	protected onResize = () => {
		this.setState({
			viewerWidth: window.innerWidth,
			viewerHeight: window.innerHeight,
		});
	}

	private _frameLoopHandle: number;
	protected frameLoop = () => {
		this._frameLoopHandle = window.requestAnimationFrame(this.frameLoop);
		let t_ms = window.performance.now();
		let t_s = t_ms / 1000;

		// handle user input
			// canvas.style.cursor = ...
		this.scene.updateWorldTransforms();
		// step animation
		this.renderer.render(this.mainRenderPass);
	}

}