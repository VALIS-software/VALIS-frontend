/*

	Viewer
	- All coordinates are set in DOM pixel units relative to the canvas (unless marked as otherwise)

    Todo:
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
import { Object2D, Object2DInternal } from './ui/core/Object2D';
import Rect from './ui/core/Rect';
import { ReactObject, ReactObjectContainer } from "./ui/core/ReactObject";

interface Props {
    width: number;
    height: number;
}

interface State {
    reactObjects: Array<ReactObject>
}

export class Viewer extends React.Component<Props, State> {

    protected canvas: HTMLCanvasElement;
    protected device: Device;
    protected renderer: Renderer;
    protected mainRenderPass: RenderPass;
    protected scene: Object2D;

    p: Rect;
    e: ReactObject;

    constructor(props: Props) {
        super(props);

        this.state = {
            reactObjects: []
        }

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

        this.e = new ReactObject(<ExampleComponent text="Testing 123" />, 100, -20);
        this.e.layoutParentX = 1/columns;
        this.e.layoutX = -0.5;
        this.e.layoutParentY = 0.5;
        this.e.layoutY = -0.5;
        this.e.layoutH = 1;
        p.add(this.e);

        this.mainRenderPass = new RenderPass(
            null,
            this.scene,
            {
                clearColor: [1, 1, 1, 1],
                clearDepth: 1
            }
        );

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

        console.log(`Viewer created with device %c"${this.device.name}"`, 'font-weight: bold');

        this.frameLoop();
    }

    componentWillUnmount() {
        for (let node of this.scene) {
            if (node instanceof Renderable) node.releaseGPUResources();
        }
        SharedResources.release();
        this.device = null;
        this.renderer = null;

        window.cancelAnimationFrame(this._frameLoopHandle);
    }

    componentDidUpdate(prevProps: Props, prevState: State, snapshot: any) {
        if (
            this.props.width !== prevProps.width ||
            this.props.height !== prevProps.height
        ) {
            this.updateSceneTransform();
            this.renderer.render(this.mainRenderPass);
        }
    }

    render() {
        const pixelRatio = window.devicePixelRatio || 1;

        return (
            <div className="viewer" style={{ position: 'relative' }}>
                <canvas
                    ref={(v) => this.canvas = v}
                    width={this.props.width * pixelRatio + 'px'}
                    height={this.props.height * pixelRatio + 'px'}
                    style={{
                        display: 'block',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: this.props.width + 'px',
                        height: this.props.height + 'px',
                        zIndex: 0,
                        outline: '1px solid blue',
                    }}
                />
                {this._reactObjects.map((ro) => <ReactObjectContainer key={ro.reactUid} reactObject={ro} scene={this.scene} />)}
            </div>
        )
    }

    private _frameLoopHandle: number;
    private _reactObjects = new Array<ReactObject>();
    protected frameLoop = () => {
        this._frameLoopHandle = window.requestAnimationFrame(this.frameLoop);
        let t_ms = window.performance.now();
        let t_s = t_ms / 1000;

        this.e.content = <ExampleComponent text={Math.round(t_s) + ' s'} />

        // demo animate
        this.p.layoutW = (Math.cos(t_s) * 0.5 + 0.5) * 0.9 + 0.1;

        // handle user input
        // canvas.style.cursor = ...
        // step animation

        // -- scene graph must not change after this point --
        this.renderer.render(this.mainRenderPass);
        this.gatherReactObjects();
    }

    /**
	 * Apply DOM pixel coordinate system to the scene via a transform on the root node
	 * - Flip z-axis from default OpenGL coordinates so that 1 = 'above' the screen and -1 is inside the screen
	 * - z coordinates clip outside of -1 to 1
	 * - (0, 0) corresponds to the top-left of the canvas
	 * - (canvas.clientWidth, canvas.clientHeight) corresponds to the bottom left
	 */
    protected updateSceneTransform() {
        // width and height should be the _display_ size of the scene in DOM pixel units
        let w_dom = this.props.width;
        let h_dom = this.props.height;
        this.scene.x = -1;
        this.scene.y = 1;
        this.scene.sx = 2 / w_dom;
        this.scene.sy = -2 / h_dom;
        this.scene.sz = -1;
        this.scene.w = w_dom;
        this.scene.h = h_dom;

        this.scene.applyTreeTransforms();
    }

	/**
	 * Given bounds in OpenGL display coordinates (clip-space), return the same bounds in DOM pixel coordinates (relative to the canvas)
	 * This applies the inverse of the scene transform
	 */
    protected clipSpaceBoundsToDomPixels(clipSpaceBounds: { l: number, r: number, t: number, b: number }) {
        return {
            l: (clipSpaceBounds.l - this.scene.x) / this.scene.sx,
            r: (clipSpaceBounds.r - this.scene.x) / this.scene.sx,
            t: (clipSpaceBounds.t - this.scene.y) / this.scene.sy,
            b: (clipSpaceBounds.b - this.scene.y) / this.scene.sy,
        }
    }

    protected gatherReactObjects() {
        // find all react nodes in the scene
        let reactObjectIndex = 0;
        let reactObjectsChanged = false;

        for (let node of this.scene) {
            if (!(node instanceof ReactObject)) continue;
            let last = this._reactObjects[reactObjectIndex];
            
            if (!reactObjectsChanged) {
                reactObjectsChanged = last !== node;
            }

            this._reactObjects[reactObjectIndex] = node;

            reactObjectIndex++;
        }

        reactObjectsChanged = reactObjectsChanged || (reactObjectIndex !== this._reactObjects.length);
        
        // trim excess nodes from the previous frame
        if (reactObjectIndex < this._reactObjects.length) {
            this._reactObjects.length = reactObjectIndex;
        }

        // trigger react re-render of viewer if the node list has changed
        if (reactObjectsChanged) {
            this.setState({
                reactObjects: this._reactObjects
            });
        }
    }

}

class ExampleComponent extends React.Component<{text: string}, {text: string}> {

    constructor(props: { text: string }) {
        super(props);
    }

    shouldComponentUpdate(nextProps: {text: string}) {
        return nextProps.text != this.props.text;
    }

    render() {
        return (<div style={{
            background: '#333',
            borderRadius: '5px',
            color: 'white',
            padding: 10,
            height: '100%',
        }}>{this.props.text}</div>);
    }

}

export default Viewer;