import React = require("react");
import IconButton from "material-ui/IconButton";
import SvgAdd from "material-ui/svg-icons/content/add";
import Animator from "../animation/Animator";
import PanelModel from "../model/PanelModel";
import TrackModel from "../model/TrackModel";
import Object2D from "./core/Object2D";
import ReactObject from "./core/ReactObject";
import Rect from "./core/Rect";
import Panel from "./Panel";
import TrackRow from "./TrackRow";
import { DEFAULT_SPRING } from "./UIConstants";

class TrackViewer extends Object2D {

    // layout settings
    readonly trackHeaderWidth: number = 180;
    readonly panelHeaderHeight: number = 50;
    readonly defaultTrackHeight: number = 200;
    readonly spacing = {
        x: 5,
        y: 5
    };
    readonly xAxisHeight = 40; // height excluding spacing
    readonly minPanelWidth = 35;
    readonly minTrackHeight = 35;

    protected edges = {
        vertical: new Array<number>(),
        horizontal: new Array<number>(),
    }

    protected tracks = new Set<TrackRow>();
    protected panels = new Set<Panel>();

    /** used to collectively position panels and track tiles */
    protected grid: Object2D;
    protected addPanelButton: ReactObject;

    constructor() {
        super();
        this.render = false;

        // fill parent dimensions
        this.layoutW = 1;
        this.layoutH = 1;

        this.grid = new Rect(0, 0, [0.9, 0.9, 0.9, 1]); // grid is Rect type for debug display
        this.grid.render = false;
        this.add(this.grid);
        this.initializeGridResizing();

        this.addPanelButton = new ReactObject(
            <AddPanelButton onClick={() => {
                this.addPanel({ name: 'Chromosome 1', x0: 0, x1: 249e6}, true);
            }} />,
            this.panelHeaderHeight,
            this.panelHeaderHeight
        );
        this.addPanelButton.x = this.spacing.x * 0.5;
        this.addPanelButton.layoutParentX = 1;
        this.addPanelButton.layoutY = -1;
        this.addPanelButton.y = -this.xAxisHeight - this.spacing.x * 0.5;
        this.grid.add(this.addPanelButton);

        this.layoutGridContainer();
    }

    // track-viewer state deltas
    addTrackRow(model: TrackModel, heightPx: number = this.defaultTrackHeight) {
        let edges = this.edges.horizontal;
        let newRowIndex = Math.max(edges.length - 1, 0);

        if (edges.length === 0) edges.push(0);
        let lastEdge = edges[edges.length - 1];
        edges.push(lastEdge + heightPx);

        // create a tack and add the header element to the grid
        let trackRow = new TrackRow(model, newRowIndex, this.layoutTrackRow, this.spacing);
        // add track tile to all panels
        for (let panel of this.panels) {
            panel.addTrack(trackRow.createTrack());
        }
        this.tracks.add(trackRow);

        trackRow.header.x = -this.trackHeaderWidth + this.spacing.x * 0.5;
        trackRow.header.w = this.trackHeaderWidth;

        this.grid.add(trackRow.header);
        this.grid.add(trackRow.resizeHandle);

        trackRow.resizeHandle.layoutW = 1;
        trackRow.resizeHandle.addInteractionListener('dragstart', (e) => { e.preventDefault(); this.startResizingTrack(trackRow) });
        trackRow.resizeHandle.addInteractionListener('dragend', (e) => { e.preventDefault(); this.endResizingTrack(trackRow) });

        trackRow.setResizable(true);

        this.positionTrack(trackRow, false);
    }

    addPanel(model: PanelModel, animate: boolean) {
        let edges = this.edges.vertical;
        let newColumnIndex = Math.max(edges.length - 1, 0);

        // add a new column edge, overflow the grid so the panel extends off the screen
        if (edges.length === 0) edges.push(0);
        let newWidth = newColumnIndex == 0 ? 1 : 1 / newColumnIndex;
        let newEdge = 1 + newWidth;
        edges.push(newEdge);

        // create panel object and add header to the scene graph
        let panel = new Panel(model, newColumnIndex, (p) => this.closePanel(p, true), this.spacing, this.panelHeaderHeight, this.xAxisHeight);
        panel.layoutH = 1; // fill the full grid height
        this.grid.add(panel);

        // initialize tracks for this panel
       for (let trackRow of this.tracks) {
           panel.addTrack(trackRow.createTrack());
           this.layoutTrackRow(trackRow);
       }

        this.panels.add(panel);

        panel.resizeHandle.addInteractionListener('dragstart', (e) => { e.preventDefault(); this.startResizingPanel(panel); });
        panel.resizeHandle.addInteractionListener('dragend', (e) => { e.preventDefault(); this.endResizingPanel(panel); });

        panel.addEventListener('axisPointerUpdate', (axisPointers) => {
            for (let p of this.panels) {
                if (p === panel) continue;
                p.setSecondaryAxisPointers(axisPointers);
            }
        });

        // set initial position
        this.positionPanel(panel, false);

        // scale the edges down to fit within the grid space
        let multiplier = 1 / newEdge;
        for (let e = 0; e < edges.length; e++) {
            edges[e] *= multiplier;
        }

        this.updatePanels(animate);
    }

    closePanel(panel: Panel, animate: boolean){
        if (panel.closing) {
            console.error(`Trying to remove already removed panel`);
            return;
        }

        let edges = this.edges.vertical;

        panel.closing = true;

        // if the panel is being resized, stop it
        this.endResizingPanel(panel);

        // remove column from edges
        this.removeColumn(edges, panel.column);

        // update column indexes of remaining panels
        for (let p of this.panels) {
            if (p.column > panel.column) {
                p.column = p.column - 1;
            }
        }

        this.updatePanels(animate);

        // animate panel's width to 0, after which delete the panel
        if (animate) {
            Animator.addAnimationCompleteCallback(panel, 'layoutW', this.cleanupPanel, true);
            Animator.springTo(panel, { layoutW: 0 }, DEFAULT_SPRING);
        } else {
            this.cleanupPanel(panel);
        }

        // clear edges if there's less then 2, this allows edges to be re-initialized
        if (edges.length < 2) {
            edges.length = 0;
        }
    }

    /**
     * Removes the panel from the scene and cleans up resources
     *
     * **Should only be called after closePanel**
     */
    protected cleanupPanel = (panel: Panel) => {
        if (!panel.closing) {
            console.warn('cleanupPanel() called before closing the panel');
            this.closePanel(panel, false);
        }

        // remove from panel list
        if (!this.panels.has(panel)) {
            console.error('Cleanup executed twice on a panel');
            return;
        }

        this.panels.delete(panel);

        // stop any active animations on the panel
        Animator.stop(panel);
        // remove any open cleanupPanel panel callbacks
        Animator.removeAnimationCompleteCallbacks(panel, 'layoutW', this.cleanupPanel);

        // remove the panel from the scene
        this.grid.remove(panel);

        // delete track tiles from the track
        // (we can leave them in the scene-graph of the panel and the GC should still cull them all)
        for (let track of this.tracks) {
            for (let tile of track.tracks) {
                if (tile.panel === panel) {
                    track.deleteTrack(tile);
                }
            }
        }

        panel.releaseGPUResources();

        // strictly we don't need to do this but listener bugs may prevent the GC from clearing the panel
        panel.removeAllListeners(true);
    }

    protected updatePanels(animate: boolean) {
        // count open panels
        let openPanelCount = 0;
        for (let p of this.panels) if (!p.closing) openPanelCount++;
        // panels are only closable if more than 1 are open
        for (let p of this.panels) {
            p.closable = openPanelCount > 1;
            p.setResizable(p.column < (this.edges.vertical.length - 2) && !p.closing);
            // animate all other panels to column positions
            this.positionPanel(p, animate);
        }
    }

    /**
     * Remove a column from a set of edges in a physically natural way; the edges either side together as if either side was expanding under spring forces to fill the empty space
     */
    protected removeColumn(edges: Array<number>, index: number) {
        if (index >= edges.length || index < 0) return false;

        let leftmostEdge = edges[0];
        let rightmostEdge = edges[edges.length - 1];
        let leftEdge = edges[index];
        let rightEdge = edges[index + 1] || rightmostEdge;

        let lSpan = leftEdge - leftmostEdge;
        let rSpan = rightmostEdge - rightEdge;
        let totalSpan = rSpan + lSpan;

        // determine where the left and right edges should come together
        let relativeMergePoint = totalSpan == 0 ? 0.5 : (lSpan / totalSpan);
        let edgeMergeTarget = relativeMergePoint * (rightEdge - leftEdge) + leftEdge;

        // evenly redistribute all the edges ether side to fill the new space
        let newRSpan = rightmostEdge - edgeMergeTarget;
        let newLSpan = edgeMergeTarget - leftmostEdge;

        let rSpanMultiplier = rSpan == 0 ? 0 : newRSpan / rSpan;
        for (let i = index + 1; i < edges.length; i++) {
            edges[i] = edgeMergeTarget + (edges[i] - rightEdge) * rSpanMultiplier;
        }

        let lSpanMultiplier = newLSpan / lSpan;
        for (let i = 0; i < index; i++) {
            edges[i] = leftmostEdge + (edges[i] - leftmostEdge) * lSpanMultiplier;
        }

        // remove edge from list
        edges.splice(index, 1);

        return true;
    }

    // @! needs better name?
    protected positionPanel(panel: Panel, animate: boolean) {
        let edges = this.edges.vertical;
        let layoutParentX = edges[panel.column];
        let layoutW = panel.closing ? 0 : edges[panel.column + 1] - edges[panel.column];
        if (animate) {
            Animator.springTo(panel, { layoutParentX: layoutParentX, layoutW: layoutW }, DEFAULT_SPRING);
        } else {
            Animator.stop(panel, ['layoutParentX', 'layoutW']);
            panel.layoutParentX = layoutParentX;
            panel.layoutW = layoutW;
        }
    }

    protected positionTrack(track: TrackRow, animate: boolean) {
        let edges = this.edges.horizontal;
        let y = edges[track.row];
        let h = edges[track.row + 1] - edges[track.row];
        if (animate) {
            Animator.springTo(track, { y: y, h: h }, DEFAULT_SPRING);
        } else {
            Animator.stop(track, ['y', 'h']);
            track.y = y;
            track.h = h;
        }
    }

    protected onAdded() {
        super.onAdded();
        Animator.addStepCompleteCallback(this.onAnimationStep);
    }

    protected onRemoved() {
        super.onRemoved();
        Animator.removeStepCompleteCallback(this.onAnimationStep);
    }

    protected onAnimationStep = () => {
        let maxX = 1;
        for (let panel of this.panels) {
            maxX = Math.max(panel.layoutParentX + panel.layoutW, maxX);
        }
        this.addPanelButton.layoutParentX = maxX;
    }

    protected layoutGridContainer() {
        this.grid.x = this.trackHeaderWidth + this.spacing.x * 0.5;
        this.grid.w =
            -this.trackHeaderWidth - this.spacing.x
            - this.addPanelButton.w;
        this.grid.layoutW = 1;
        this.grid.y = this.panelHeaderHeight + this.spacing.y * 0.5 + this.xAxisHeight;

        // (grid height is set dynamically when laying out tracks)
    }

    /**
     * A TrackRow isn't an Object2D, like Panel is, so we manually layout track elements with the track row's y and height
     */
    protected layoutTrackRow = (trackRow: TrackRow) => {
        // handle
        let handle = trackRow.resizeHandle;
        handle.layoutY = -0.5;
        handle.y = trackRow.y + trackRow.h;

        // header
        trackRow.header.y = trackRow.y + this.spacing.y * 0.5;
        trackRow.header.h = trackRow.h - this.spacing.y;

        // tiles
        for (let tile of trackRow.tracks) {
            tile.y = trackRow.y + this.spacing.y * 0.5;
            tile.h = trackRow.h - this.spacing.y;
        }

        // set grid height from the height of all the tracks
        let maxY = 0;
        for (let track of this.tracks) {
            maxY = Math.max(track.y + track.h, maxY);
        }

        // we add a little bit of padding onto the bottom of the grid so that the bottom resize handle contained within
        // this is required to enable dragging the bottom track resize handle
        this.grid.h = maxY + this.spacing.y * 0.5;
    }

    // local state for grid-resizing
    private _resizingPanels = new Set<Panel>();
    private _resizingTracks = new Set<TrackRow>();

    /**
     * Setup event listeners to enable resizing of panels and tracks
     */
    protected initializeGridResizing() {
        const draggedVEdges: {
            [i: number]: {
                i: number,
                p0: number,
                e0: number,
                obj: any,
            }
        } = {};

        const draggedHEdges: {
            [i: number]: {
                i: number,
                p0: number,
                e0: number,
                obj: any,
            }
        } = {};

        this.grid.addInteractionListener('dragstart', (e) => {
            let resizing = (this._resizingPanels.size + this._resizingTracks.size) > 0;
            if (resizing) {
                e.preventDefault();
                e.stopPropagation();
            }

            for (let panel of this._resizingPanels) {
                let i = panel.column + 1;
                draggedVEdges[i] = {
                    i: i,
                    p0: e.fractionX,
                    e0: this.edges.vertical[i],
                    obj: panel,
                }
            }

            for (let track of this._resizingTracks) {
                let i = track.row + 1;
                draggedHEdges[i] = {
                    i: i,
                    p0: e.localY,
                    e0: this.edges.horizontal[i],
                    obj: track
                }
            }
        });

        this.grid.addInteractionListener('dragmove', (e) => {
            let resizing = (this._resizingPanels.size + this._resizingTracks.size) > 0;
            if (resizing) {
                e.preventDefault();
                e.stopPropagation();
            }

            for (let k in draggedVEdges) {
                let s = draggedVEdges[k];
                let dx = e.fractionX - s.p0;
                let gridWidthPx = this.grid.getComputedWidth();
                let minFWidth = this.minPanelWidth / gridWidthPx;
                let min = ((this.edges.vertical[s.i - 1] + minFWidth) || 0);
                let max = ((this.edges.vertical[s.i + 1] - minFWidth) || 1);
                this.edges.vertical[s.i] = Math.min(Math.max(s.e0 + dx, min), max);

                for (let p of this.panels) {
                    if ((p.column === s.i) || (p.column === (s.i - 1))) {
                        this.positionPanel(p, false);
                    }
                }
            }

            for (let k in draggedHEdges) {
                let s = draggedHEdges[k];
                let dy = e.localY - s.p0;
                let min = ((this.edges.horizontal[s.i - 1] + this.minTrackHeight) || 0);
                let max = ((this.edges.horizontal[s.i + 1] - this.minTrackHeight) || Infinity);
                this.edges.horizontal[s.i] = Math.min(Math.max(s.e0 + dy, min), max);

                for (let t of this.tracks) {
                    if (t.row === s.i || (t.row === (s.i - 1))) {
                        this.positionTrack(t, false);
                    }
                }
            }
        });

        this.grid.addInteractionListener('dragend', (e) => {
            // cleanup dragged edges state
            for (let k in draggedVEdges) {
                let s = draggedVEdges[k];
                if (!this._resizingPanels.has(s.obj)) {
                    delete draggedVEdges[k];
                }
            }
            for (let k in draggedHEdges) {
                let s = draggedHEdges[k];
                if (!this._resizingTracks.has(s.obj)) {
                    delete draggedHEdges[k];
                }
            }
        });
    }

    protected startResizingPanel(panel: Panel) {
        this._resizingPanels.add(panel);
    }

    protected endResizingPanel(panel: Panel) {
        this._resizingPanels.delete(panel);
    }

    protected startResizingTrack(track: TrackRow) {
        this._resizingTracks.add(track);
    }

    protected endResizingTrack(track: TrackRow) {
        this._resizingTracks.delete(track);
    }

}

function AddPanelButton(props: {
    onClick: () => void
}) {
    return <div
    style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        color: '#e8e8e8',
        backgroundColor: '#171615',
        borderRadius: '8px 0px 0px 8px',
    }}
    >
        <div style={{
            position: 'absolute',
            width: '100%',
            textAlign: 'right',
            top: '50%',
            transform: 'translate(0, -50%)',
        }}>
            <IconButton onClick={props.onClick}>
                <SvgAdd color='rgb(171, 171, 171)' hoverColor='rgb(255, 255, 255)' />
            </IconButton>
        </div>
    </div>
}

export default TrackViewer;