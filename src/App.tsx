/*

	Viewer
	- All coordinates are set in DOM pixel units relative to the canvas (unless marked as otherwise)

	- DOM element node
	- Cursor to null and :type
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
import Node from './rendering/Node';
import Device from './rendering/Device';
import RenderPass from './rendering/RenderPass';
import Renderer from './rendering/Renderer';
import Renderable from './rendering/Renderable';
import SharedResources from './ui/core/SharedResources';
import Object2D from './ui/core/Object2D';
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

	p: Rect;

	constructor(props: Props) {
		super(props);

		this.scene = new Object2D();

		let g = new Rect(100, 100, [0, 1, 0, 1]);
		g.x = 30;
		g.y = 30;
		this.scene.add(g);

		let b = new Rect(10, 10, [0, 0, 1, 1]);
		b.x = 0;
		b.z = 0.1;
		b.layoutParentX = 0.5;
		b.layoutParentY = 0.5;
		b.layoutX = -0.5;
		b.layoutY = -0.5;
		b.layoutW = 1;
		b.w = -10;
		g.add(b);

		let p = new Rect(0, 0, [1, 0, 1, 1]);
		this.p = p;
		this.scene.add(p);
		p.layoutX = -0.5;
		p.layoutParentX = 0.5;
		p.layoutW = 1;
		p.h = 100;
		p.w = -10;
		p.y = 10;
		p.z = 0.0;
		p.y = 200;

		let gutterPx = 10;
		let columns = 3;
		for (let i = 0; i < columns; i++) {
			let c = new Rect(0, 10, [0, 1, 1, 1]);
			p.add(c);

			// fill height subtract 10px
			c.layoutH = 1;
			c.h = -10;
			// center y
			c.layoutY = -0.5;
			c.layoutParentY = 0.5;

			// set width to 1/3 parent - gutter px
			c.layoutW = 1.0 / columns;
			c.w = -gutterPx;

			// position at left-most of each column + gutter offset
			c.layoutParentX = i / columns;
			c.x = gutterPx * 0.5;

			c.z = 0.1;
		}

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

		console.log(g.getWorldBounds());
		console.log(this.scene);
	}

	componentDidMount() {
		let gl = this.canvas.getContext('webgl', { antialias: true });

		if (gl == null) {
			throw 'WebGL not supported';
		}

		this.device = new Device(gl);
		this.renderer = new Renderer(this.device);
		SharedResources.initialize(this.device);
		this.scene.applyTreeTransforms(true);

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

	/**
	 * Apply DOM pixel coordinate system to the scene via a transform on the root node
	 * - Flip z-axis from default OpenGL coordinates so that 1 = 'above' the screen and -1 is inside the screen
	 * - z coordinates clip outside of -1 to 1
	 * - (0, 0) corresponds to the top-left of the canvas
	 * - (canvas.clientWidth, canvas.clientHeight) corresponds to the bottom left
	 */
	protected updateSceneTransform() {
		// viewerWidth and viewerHeight should be the display size of the scene in DOM pixel units
		let w_dom = this.state.viewerWidth;
		let h_dom = this.state.viewerHeight;
		this.scene.x = -1;
		this.scene.y = 1;
		this.scene.sx = 2/w_dom;
		this.scene.sy = -2/h_dom;
		this.scene.sz = -1;
		this.scene.w = w_dom;
		this.scene.h = h_dom;

		this.scene.applyTreeTransforms();
	}

	/**
	 * Given bounds in OpenGL display coordinates (clip-space), return the same bounds in DOM pixel coordinates (relative to the canvas)
	 * This applies the inverse of the scene transform
	 */
	protected clipSpaceBoundsToDomPixels(clipSpaceBounds: {l: number, r: number, t: number, b: number}) {
		return {
			l: (clipSpaceBounds.l - this.scene.x) / this.scene.sx,
			r: (clipSpaceBounds.r - this.scene.x) / this.scene.sx,
			t: (clipSpaceBounds.t - this.scene.y) / this.scene.sy,
			b: (clipSpaceBounds.b - this.scene.y) / this.scene.sy,
		}
	}

	private _frameLoopHandle: number;
	protected frameLoop = () => {
		this._frameLoopHandle = window.requestAnimationFrame(this.frameLoop);
		let t_ms = window.performance.now();
		let t_s = t_ms / 1000;

		// demo animate
		this.p.layoutW = (Math.cos(t_s) * 0.5 + 0.5) * 0.9 + 0.1;
		this.scene.applyTreeTransforms();
	
		// apply inverse of scene transform to go from clip-space to DOM pixels
		let wb = this.clipSpaceBoundsToDomPixels(this.p.getWorldBounds());
		console.log(wb);

		// handle user input
			// canvas.style.cursor = ...
		// step animation

		// scene graph must not change after this point
		this.renderer.render(this.mainRenderPass);
	}

}