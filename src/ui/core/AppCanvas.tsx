/*

	AppCanvas
    - Manages frame loop
    - Manages root scene node and coordinate system
	- All coordinates are set in DOM pixel units relative to the canvas (unless marked as otherwise)
*/

import * as React from "react";
import Node from '../../rendering/Node';
import Device from '../../rendering/Device';
import RenderPass from '../../rendering/RenderPass';
import Renderer from '../../rendering/Renderer';
import Renderable from '../../rendering/Renderable';
import SharedResources from './SharedResources';
import { Object2D, Object2DInternal } from './Object2D';
import { ReactObject, ReactObjectContainer } from "./ReactObject";


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

        // @! temporary initial GL state for 2D drawing
        // in the future this should be applied to the root 2D node
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.disable(gl.CULL_FACE);

        this.device = new Device(gl);
        this.renderer = new Renderer(this.device);

        SharedResources.initialize(this.device);

        this.addInputListeners();

        console.log(`AppCanvas created with device %c"${this.device.name}"`, 'font-weight: bold');
    }

    componentWillUnmount() {
        for (let node of this.scene) {
            if (node instanceof Renderable) node.releaseGPUResources();
        }

        SharedResources.release();

        this.device = null;
        this.renderer = null;

        this.removeInputListeners();
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
                    }}
                />
                {
                    this.state.reactObjects.map(
                        (ro) => <ReactObjectContainer key={ro.reactUid} reactObject={ro} scene={this.scene} />
                    )
                }
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
	 * - Flip z-axis from default OpenGL coordinates so that 1 = in front the screen and -1 is inside the screen
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

    protected addInputListeners() {
        this.canvas.addEventListener('mousedown', this.onMouseDown);
        window.addEventListener('mouseup', this.onMouseUp);
        window.addEventListener('mousemove', this.onMouseMove);
        window.addEventListener('wheel', this.onWheel);
    }

    protected removeInputListeners() {
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        window.removeEventListener('mouseup', this.onMouseUp);
        window.removeEventListener('mousemove', this.onMouseMove);
        window.removeEventListener('wheel', this.onWheel);
    }

    protected canvasCoordinates(e: MouseEvent) {
        let x: number = 0;
        let y: number = 0;

        let canvasRect = this.canvas.getBoundingClientRect();
        let canvasX = window.scrollX + this.canvas.clientLeft;
        let canvasY = window.scrollY + canvasRect.top;
        x = e.pageX - canvasX;
        y = e.pageY - canvasY;

        return  {
            x: x,
            y: y,
        }
    }

    protected worldSpaceCoordinates(canvasSpaceCoordinates: {x: number, y: number}) {
        return {
            x: (canvasSpaceCoordinates.x / this.props.width)  * 2 - 1,
            y: -((canvasSpaceCoordinates.y / this.props.height) * 2 - 1),
        }
    }

    protected onMouseMove = (e: MouseEvent) => {
        let worldSpacePosition = this.worldSpaceCoordinates(this.canvasCoordinates(e));
        let hitNodes = [];

        for (let node of this.scene) {
            if (node instanceof Object2D) {
                let nodeInternal = node as any as Object2DInternal;
                if (!nodeInternal.handlesPointerEvents) continue;

                let worldSpaceBounds = node.getWorldBounds();
                
                // hit-test position with object bounds
                if (
                    worldSpacePosition.x >= worldSpaceBounds.l &&
                    worldSpacePosition.x <= worldSpaceBounds.r &&
                    worldSpacePosition.y >= worldSpaceBounds.b &&
                    worldSpacePosition.y <= worldSpaceBounds.t
                ) {
                    hitNodes.push(node);
                }
            }
        }

        hitNodes.sort(this.compareZ);

        for (let i = 0; i < hitNodes.length; i++) {
            let node = hitNodes[i];
            // node.emit('mousemove', e)
            // e.stopPropagation()
            // if (e.defaultPrevented) break;
        }
    }
    protected onMouseDown = (e: MouseEvent) => { }
    protected onMouseUp = (e: MouseEvent) => { }
    protected onWheel = (e: WheelEvent) => { }

    protected compareZ(a: Object2D, b: Object2D) {
        return a.getWorldZ() - b.getWorldZ();
    }

}

export default AppCanvas;