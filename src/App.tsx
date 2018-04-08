/*
	- Viewer height should be set by content
	- Layout management - Alignment percent?
		- If using alignment child worldTransformNeedsUpdate should flag when size changed changed
		- Still difficult to center rect
		- Percentage of parent dimensions?
		- 

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

		this.scene = new Object2D();

		let r = new Rect(1, 1);
		r.x = 0;
		r.y = 0;
		let g = new Rect(100, 100, [0, 1, 0, 1]);
		g.x = 30;
		g.y = 30;
		this.scene.add(g);
		this.scene.add(r);

		let b = new Rect(10, 10, [0, 0, 1, 1]);
		b.x = 0;
		b.z = 0.1;
		g.add(b);	

		this.scene.updateWorldTransforms(true);

		console.log(g.getWorldBounds());

		this.mainRenderPass = new RenderPass(
			null,
			this.scene,
			{
				clearColor: [1, 1, 1, 1],
				clearDepth: 1
			}
		);

		this.state = {
			viewerWidth: window.innerWidth,
			viewerHeight: window.innerHeight,
		}

		this.updateSceneTransform();
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

	componentDidUpdate(prevProps: Props, prevState: State, snapshot: any) {
		if (
			this.state.viewerWidth !== prevState.viewerWidth ||
			this.state.viewerHeight !== prevState.viewerHeight
		) {
			this.updateSceneTransform();
		}
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
						zIndex: 0,
						outline: '1px solid blue',
					}}
				/>
				<div className="dom-overlay" style={{
					position: 'absolute',
					top: 0,
					left: 0,
					width: '100%',
					height: '100%',
					zIndex: 1
				}}>
					<div style={{
						position: 'absolute',
						width: '10px',
						height: '10px',
						left: '20px', top: '20px',
						background: 'pink'}}></div>
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

	protected updateSceneTransform() {
		// apply DOM pixel coordinate system to the scene via a transform on the root node
		// viewerWidth and viewerHeight should be the display size of the scene in DOM pixel units
		// (0, 0) corresponds to the top-left of the canvas
		// (w_dom, h_dom) corresponds to the bottom right
		// the z-axis is flipped from default OpenGL coordinates so that 1 = 'above' the screen and -1 is inside the screen
		// z coordinates clip outside of -1 to 1
		let w_dom = this.state.viewerWidth;
		let h_dom = this.state.viewerHeight;
		this.scene.x = -1;
		this.scene.y = 1;
		this.scene.sx = 2/w_dom;
		this.scene.sy = -2/h_dom;
		this.scene.sz = -1;

		this.scene.updateWorldTransforms();
	}

	private _frameLoopHandle: number;
	protected frameLoop = () => {
		this._frameLoopHandle = window.requestAnimationFrame(this.frameLoop);
		let t_ms = window.performance.now();
		let t_s = t_ms / 1000;

		// handle user input
			// canvas.style.cursor = ...
		// step animation

		this.scene.updateWorldTransforms();
		// scene graph must not change after this point
		this.renderer.render(this.mainRenderPass);
	}

}