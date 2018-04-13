/*

	AppCanvas
    - Manages frame loop
    - Manages root scene node and coordinate system
	- All coordinates are set in DOM pixel units relative to the canvas (unless marked as otherwise)
*/

import * as React from "react";
import Node from './rendering/Node';
import Device from './rendering/Device';
import RenderPass from './rendering/RenderPass';
import Renderer from './rendering/Renderer';
import Renderable from './rendering/Renderable';
import SharedResources from './ui/core/SharedResources';
import { Object2D, Object2DInternal } from './ui/core/Object2D';
import { ReactObject, ReactObjectContainer } from "./ui/core/ReactObject";


interface Props {
    width: number;
    height: number;
    content: Object2D;
}

interface State {
    reactObjects: Array<ReactObject>
}

/**
 * AppCanvas
 * - Manages frame loop
 * - Manages root scene node and coordinate system
 */
export class AppCanvas extends React.Component<Props, State> {

    protected canvas: HTMLCanvasElement;
    protected device: Device;
    protected renderer: Renderer;
    protected mainRenderPass: RenderPass;
    protected scene: Object2D;

    constructor(props: Props) {
        super(props);

        this.state = {
            reactObjects: []
        }

        this.updateSceneContent();
    }

    componentDidMount() {
        if (this.device != null) {
            console.error('Component mounted twice');
        }

        let gl = this.canvas.getContext('webgl', { antialias: true });

        if (gl == null) {
            throw 'WebGL not supported';
        }

        this.device = new Device(gl);
        this.renderer = new Renderer(this.device);

        SharedResources.initialize(this.device);

        console.log(`Viewer created with device %c"${this.device.name}"`, 'font-weight: bold');
    }

    componentWillUnmount() {
        for (let node of this.scene) {
            if (node instanceof Renderable) node.releaseGPUResources();
        }

        SharedResources.release();

        this.device = null;
        this.renderer = null;
    }

    componentDidUpdate(prevProps: Props, prevState: State, snapshot: any) {
        if (prevProps.content != this.props.content) {
            this.updateSceneContent();
        }
        
        if (
            this.props.width !== prevProps.width ||
            this.props.height !== prevProps.height
        ) {
            this.updateSceneTransform();
            this.scene.applyTreeTransforms();
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
                {this.state.reactObjects.map((ro) => <ReactObjectContainer key={ro.reactUid} reactObject={ro} scene={this.scene} />)}
            </div>
        )
    }

    renderCanvas() {
        this.renderer.render(this.mainRenderPass);
        this.updateReactObjects();
    }

    protected updateSceneContent() {
        this.scene = new Object2D();
        if (this.props.content != null) {
            this.scene.add(this.props.content);
        }
        this.mainRenderPass = new RenderPass(
            null,
            this.scene,
            {
                clearColor: [1, 1, 1, 1],
                clearDepth: 1
            }
        );
        this.updateSceneTransform();
        this.scene.applyTreeTransforms();
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

    private _reactObjects = new Array<ReactObject>();
    protected updateReactObjects() {
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

export default AppCanvas;