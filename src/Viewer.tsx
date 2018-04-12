/*

	Viewer
	- All coordinates are set in DOM pixel units relative to the canvas (unless marked as otherwise)

    Todo:
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
import { CLIENT_RENEG_LIMIT } from "tls";

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

    constructor(props: Props) {
        super(props);

        this.state = {
            reactObjects: []
        }

        this.scene = new Object2D();
        
        // layout is driven by the edges which serve as the source of truth for the layout
        // edges can change instantaneously, whereas elements within those edges may be animated to their position
        // for a given index each edge corresponds to the _left_ side of a column
        let verticalEdges = new Array<number>();
        let horizontalEdges = new Array<number>();

        // cell = grid[column][row]
        let grid = new Array<Array<Object2D>>();

        let scene = this.scene;
        let paddingXPx = 1;
        let paddingYPx = 1;

        let nColumns = 6;
        let nRows = 4;

        // generate evenly spaced edges
        for (let i = 0; i < nColumns; i++) {
            verticalEdges[i] = i / nColumns + Math.random() * 0.1;
        }
        verticalEdges[0] = 0;
        for (let i = 0; i < nRows; i++) {
            horizontalEdges[i] = i / nRows;
        }

        // fill the grid cells up with some rects
        for (let c = 0; c < nColumns; c++) {
            let col = new Array<Object2D>(nRows);
            grid[c] = col;
            for (let r = 0; r < nRows; r++) {
                let cell = new Rect(0, 0, [c/nColumns, r/nRows, 0., 1.]);
                col[r] = cell;
                this.scene.add(cell);
            }
        }

        function layoutGrid() {
            // should set animation targets
            for (let c = 0; c < grid.length; c++) {
                let col = grid[c];
                if (col == null) continue;
                for (let r = 0; r < col.length; r++) {
                    let cell = col[r];
                    if (cell == null) continue;

                    let leftEdge = c < 0 ? 0 : verticalEdges[c];
                    let rightEdge = ((c + 1) >= verticalEdges.length) ? 1 : verticalEdges[c + 1];
                    let topEdge = r < 0 ? 0 : horizontalEdges[r];
                    let bottomEdge = ((r + 1) >= horizontalEdges.length) ? 1 : horizontalEdges[r + 1];

                    cell.layoutW = rightEdge - leftEdge;
                    cell.layoutX = -0.5;
                    cell.layoutParentX = (rightEdge - leftEdge) * 0.5 + leftEdge;
                    cell.w = -paddingXPx;

                    cell.layoutH = bottomEdge - topEdge;
                    cell.layoutY = -0.5;
                    cell.layoutParentY = (bottomEdge - topEdge) * 0.5 + topEdge;
                    cell.h = -paddingYPx;
                }
            }
        }

        // energy-preserving edge remove
        // edge
        function removeEdge(edges: Array<number>, index: number) {
            if (index >= edges.length || index < 0) return false;

            let leftEdge = edges[index];
            let rightEdge = edges[index + 1] || 1;

            let rSpanLeftEdge = edges[index + 1] || 1;
            let rSpan = 1 - rSpanLeftEdge;
            let lSpan = edges[index];
            let totalSpan = rSpan + lSpan;

            // determine where the left and right edges should come together
            let edgeMergeTarget = (lSpan / totalSpan) * (rightEdge - leftEdge) + leftEdge;

            // evenly redistribute all the edges ether side to fill the new space
            let newRSpan = 1 - edgeMergeTarget;
            let newLSpan = edgeMergeTarget;

            let rSpanMultiplier = newRSpan / rSpan;
            for (let i = index + 1; i < edges.length; i++) {
                edges[i] = (edges[i] - rSpanLeftEdge) * rSpanMultiplier + edgeMergeTarget;
            }

            let lSpanMultiplier = newLSpan / lSpan;
            for (let i = 1; i < index; i++) {
                edges[i] *= lSpanMultiplier;
            }

            // remove edge from list
            edges.splice(index, 1);

            return true;
        }

        function removeColumn(index: number, forEachRemovedCell?: (cell: Object2D) => void) {
            let edgeRemoved = removeEdge(verticalEdges, index);

            // remove all cells within the column from the scene
            let column = grid[index];
            if (column != null) {
                for (let r = 0; r < column.length; r++) {
                    let cell = column[r];
                    scene.remove(cell);
                    if (forEachRemovedCell != null) forEachRemovedCell(cell);
                }
            }
            // remove the column from the grid array
            grid.splice(index, 1);

            layoutGrid();
            return edgeRemoved;
        }

        function removeRow(index: number, forEachRemovedCell?: (cell: Object2D) => void) {
            let edgeRemoved = removeEdge(horizontalEdges, index);

            for (let i = 0; i < grid.length; i++) {
                let col = grid[i];
                if (col == null) continue;
                let cell = col[index];
                if (cell == null) continue;
                // remove the cell from the scene
                scene.remove(cell);
                // remove the row from the column
                col.splice(index, 1);

                if (forEachRemovedCell != null) forEachRemovedCell(cell);
            }

            layoutGrid();

            return edgeRemoved;
        }

        function addColumn() {

            let nRows = horizontalEdges.length;
            let col = new Array<Object2D>(nRows);
            for (let i = 0; i < nRows; i++) {
                let cell = new Rect(0, 0, [Math.random(), Math.random(), Math.random(), 1]);
                col[i] = cell;
                scene.add(cell);
            }
            grid.push(col);

            verticalEdges.push(1);
            // shrink edges to make space
            let lSpan = 1;
            let newLSpan = 1 - (1 / verticalEdges.length);
            let lSpanMultiplier = newLSpan / lSpan;
            for (let e = 0; e < verticalEdges.length; e++) {
                verticalEdges[e] *= lSpanMultiplier;
            }

            layoutGrid();
        }

        layoutGrid();

        (window as any).removeColumn = removeColumn;
        (window as any).removeRow = removeRow;
        (window as any).addColumn = addColumn;

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
                {this.state.reactObjects.map((ro) => <ReactObjectContainer key={ro.reactUid} reactObject={ro} scene={this.scene} />)}
            </div>
        )
    }

    private _frameLoopHandle: number;
    protected frameLoop = () => {
        this._frameLoopHandle = window.requestAnimationFrame(this.frameLoop);
        let t_ms = window.performance.now();
        let t_s = t_ms / 1000;

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

    private _reactObjects = new Array<ReactObject>();
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

export default Viewer;