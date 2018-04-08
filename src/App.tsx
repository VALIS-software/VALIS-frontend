/*
	- Object2D not renderable by default
	- Draw call order and depth issues
	- Aspect ratio and units

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
	protected scene: Node<Object2D>;

	constructor(props: Props) {
		super(props);

		this.state = {
			viewerWidth: window.innerWidth,
			viewerHeight: window.innerHeight,
		}

		this.scene = new Node();

		let r = new Rect();r.color.set([1, 0, 0, 1]);
		r.x = -1;
		r.y = 0;
		r.sx = 1;
		let g = new Rect();g.color.set([0, 1, 0, 1]);
		g.x = 1;
		g.y = 0;
		g.w = 0.5;
		g.h = 0.5;
		let b = new Rect(); b.color.set([0, 0, 1, 1]);
		b.x = 0;
		b.y = 0;
		b.w = 0.25;
		b.h = 0.25;

		this.scene.add(r);
		r.add(g);
		g.add(b);

		this.mainRenderPass = new RenderPass(
			null,
			this.scene,
			{
				clearColor: [0, 0, 0, 1],
				clearDepth: 0
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