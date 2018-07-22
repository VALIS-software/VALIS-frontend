import React = require("react");
import IconButton from "material-ui/IconButton";
import SvgAdd from "material-ui/svg-icons/content/add";
import Animator from "../animation/Animator";
import { GenomicLocation } from "../model/GenomicLocation";
import TrackModel from "../model/TrackModel";
import DatasetSelector from "../ui/components/DatasetSelector/DatasetSelector";
import AppModel from "../ui/models/AppModel";
import Object2D from "./core/Object2D";
import ReactObject from "./core/ReactObject";
import Rect from "./core/Rect";
import Panel from "./Panel";
import TrackRow from "./TrackRow";
import { DEFAULT_SPRING } from "./UIConstants";


type Row = {
    trackRow: TrackRow, // track row pseudo object, positioning properties can be animated
    heightPx: number, // updated instantaneously; not animated
}

class TrackViewer extends Object2D {

    // layout settings
    readonly trackHeaderWidth: number = 180;
    readonly panelHeaderHeight: number = 50;
    readonly defaultTrackHeight: number = 50;

    readonly spacing = {
        x: 5,
        y: 5
    };
    readonly xAxisHeight = 40; // height excluding spacing
    readonly minPanelWidth = 35;
    readonly minTrackHeight = 35;

    protected panels = new Set<Panel>();
    protected rows = new Array<Row>();

    protected panelEdges = new Array<number>();
    protected rowOffsetY: number = 0;

    /** used to collectively position panels and track tiles */
    protected grid: Object2D;
    protected addPanelButton: ReactObject;
    protected addDataTrackButton: ReactObject;

    /** used to interact with app ui */
    protected appModel: AppModel;

    constructor() {
        super();
        this.render = false;

        // fill parent dimensions
        this.layoutW = 1;
        this.layoutH = 1;

        this.grid = new Rect(0, 0, [0.9, 0.9, 0.9, 1]); // grid is Rect type for debug display
        this.grid.render = false;
        this.add(this.grid);

        this.initializeDragPanning();
        this.initializeGridResizing();

        this.addPanelButton = new ReactObject(
            <AddPanelButton onClick={() => {
                this.addPanel({ contig: 'chr1', x0: 0, x1: 249e6}, true);
            }} />,
            this.panelHeaderHeight,
            this.panelHeaderHeight,
        );
        this.addPanelButton.x =  this.spacing.x * 0.5;
        this.addPanelButton.style = {
            zIndex: 3,
        }
        this.addPanelButton.layoutParentX = 1;
        this.addPanelButton.layoutY = -1;
        this.addPanelButton.y = -this.xAxisHeight - this.spacing.x * 0.5;
        this.grid.add(this.addPanelButton);

        this.addDataTrackButton = new ReactObject(
            <AddDataTrackButton onClick={this.addDatasetBrowser} />,
            this.panelHeaderHeight,
            this.panelHeaderHeight,
        );
        this.addDataTrackButton.x = -this.trackHeaderWidth + this.spacing.x * 0.5;
        this.addDataTrackButton.layoutParentX = 0;
        this.addDataTrackButton.layoutY = -1;
        this.addDataTrackButton.w = this.trackHeaderWidth;
        this.addDataTrackButton.y = this.spacing.y * 0.5 - this.xAxisHeight - this.spacing.y;
        this.addDataTrackButton.style = {
            zIndex: 3,
        }
        this.grid.add(this.addDataTrackButton);

        const leftTrackMask = new ReactObject(<div 
            style={
                {
                    backgroundColor: '#fff',
                    zIndex: 2,
                    width: '100%',
                    height: '100%',
                }
            }
        />, this.trackHeaderWidth  + this.spacing.x, this.panelHeaderHeight + this.xAxisHeight - 0.5 * this.spacing.y);
        this.add(leftTrackMask);

        const rightTrackMask = new ReactObject(<div 
            style={
                {
                    backgroundColor: '#fff',
                    zIndex: 2,
                    width: '100%',
                    height: '100%',
                }
            }
        />, this.panelHeaderHeight + 1.5 * this.spacing.x, this.panelHeaderHeight + this.xAxisHeight - 0.5 * this.spacing.y);
        rightTrackMask.layoutParentX = 1;
        rightTrackMask.x = -this.panelHeaderHeight - 1.5 * this.spacing.x;
        this.add(rightTrackMask);

        this.layoutGridContainer();
    }

    setAppModel(appModel: AppModel) {
        this.appModel = appModel;
    }

    setRowHeight(row: TrackRow, heightPx: number, animate: boolean) {
        const result = this.rows.find(d => d.trackRow === row);
        if (result) {
            result.heightPx = heightPx;
            this.layoutTrackRows(animate);
        }
    }

    getRowHeight(row: TrackRow): number {
        const result = this.rows.find(d => d.trackRow === row);
        return result ? result.heightPx : null;
    }

    // track-viewer state deltas
    addTrackRow(model: TrackModel, heightPx: number = this.defaultTrackHeight, animate: boolean = true) {
        // create a track and add the header element to the grid

        const rowHeightSetter = (row: TrackRow, h:number) => { this.setRowHeight(row, h, true)};
        const rowHeightGetter = (row: TrackRow) : number => this.getRowHeight(row);

        let trackRow = new TrackRow((t) => this.closeTrackRow(t), model, this.spacing, rowHeightSetter, rowHeightGetter);

        // add track tile to all panels
        for (let panel of this.panels) {
            panel.addTrack(trackRow.createTrack());
        }
        
        this.rows.push({
            trackRow: trackRow,
            heightPx: heightPx,
        });

        trackRow.closeButton.layoutParentX = 1;
        trackRow.closeButton.x = -this.spacing.x;
        trackRow.closeButton.w = this.defaultTrackHeight;
        trackRow.header.x = -this.trackHeaderWidth + this.spacing.x * 0.5;
        trackRow.header.w = this.trackHeaderWidth;

        trackRow.resizeHandle.layoutW = 1;
        trackRow.resizeHandle.addInteractionListener('dragstart', (e) => {
            if (e.isPrimary && e.buttonState === 1) {
                e.preventDefault();
                this.startResizingTrackRow(trackRow);
            }
        });
        trackRow.resizeHandle.addInteractionListener('dragend', (e) => {
            if (e.isPrimary) {
                e.preventDefault();
                this.endResizingTrackRow(trackRow);
            }
        });

        trackRow.setResizable(true);

        this.grid.add(trackRow.header);
        this.grid.add(trackRow.closeButton);
        this.grid.add(trackRow.resizeHandle);

        // first instantaneously the y position of the track and override h to 0
        this.layoutTrackRows(false, trackRow);
        trackRow.h = 0;

        // then animate all the tracks to the new layout
        this.layoutTrackRows(animate);
    }

    closeTrackRow(trackRow: TrackRow, animate: boolean = true) {
        // first set height to 0, when the animation is complete, remove the row's resources
        let row: Row = this.rows.find((r) => r.trackRow === trackRow);
        if (row === undefined) return; // this trackRow has already been removed

        if (trackRow.closing) {
            return;
        }

        trackRow.closing = true;
        trackRow.setResizable(false);

        this.endResizingTrackRow(trackRow);

        // animate height to 0 and delete the row when complete
        row.heightPx = 0;

        Animator.addAnimationCompleteCallback(trackRow, 'h', this.deleteTrackRow, true);
        this.layoutTrackRows(animate);
    }

    addDatasetBrowser = () => {
        this.appModel.pushView((<DatasetSelector appModel={this.appModel}/>));
    }

    addPanel(location: GenomicLocation, animate: boolean = true) {
        let edges = this.panelEdges;
        let newColumnIndex = Math.max(edges.length - 1, 0);

        // add a new column edge, overflow the grid so the panel extends off the screen
        if (edges.length === 0) edges.push(0);
        let newWidth = newColumnIndex == 0 ? 1 : 1 / newColumnIndex;
        let newEdge = 1 + newWidth;
        edges.push(newEdge);

        // create panel object and add header to the scene graph
        let panel = new Panel((p) => this.closePanel(p, true), this.spacing, this.panelHeaderHeight, this.xAxisHeight);
        panel.setContig(location.contig);
        panel.setRange(location.x0, location.x1);
        panel.column = newColumnIndex; // @! should use array of panels instead of column field
        panel.layoutH = 1; // fill the full grid height
        this.grid.add(panel);

        // initialize tracks for this panel
       for (let row of this.rows) {
           panel.addTrack(row.trackRow.createTrack());
       }

        this.panels.add(panel);

        panel.resizeHandle.addInteractionListener('dragstart', (e) => {
            if (e.isPrimary && e.buttonState === 1) {
                e.preventDefault();
                this.startResizingPanel(panel);
            }
        });
        panel.resizeHandle.addInteractionListener('dragend', (e) => {
            if (e.isPrimary) {
                e.preventDefault();
                this.endResizingPanel(panel);
            }
        });

        panel.addEventListener('axisPointerUpdate', (axisPointers) => {
            for (let p of this.panels) {
                if (p === panel) continue;
                p.setSecondaryAxisPointers(axisPointers);
            }
        });

        // set initial position
        this.layoutPanels(false, panel);

        // scale the edges down to fit within the grid space
        let multiplier = 1 / newEdge;
        for (let e = 0; e < edges.length; e++) {
            edges[e] *= multiplier;
        }

        this.layoutPanels(animate);
    }

    closePanel(panel: Panel, animate: boolean = true){
        if (panel.closing) {
            return;
        }

        let edges = this.panelEdges;

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

        this.layoutPanels(animate);

        // animate panel's width to 0, after which delete the panel
        if (animate) {
            Animator.addAnimationCompleteCallback(panel, 'layoutW', this.deletePanel, true);
            Animator.springTo(panel, { layoutW: 0 }, DEFAULT_SPRING);
        } else {
            this.deletePanel(panel);
        }

        // clear edges if there's less then 2, this allows edges to be re-initialized
        if (edges.length < 2) {
            edges.length = 0;
        }
    }

    getPanel(index: number): null | Panel {
        let i = 0;
        for (let panel of this.panels) {
            if (i === index) {
                return panel;
            }
            i++;
        }

        return null;
    }

    /**
     * Removes the row from the scene and cleans up resources
     *
     * **Should only be called after closeTrackRow**
     */
    protected deleteTrackRow = (trackRow: TrackRow) => {
        // remove trackRow elements from scene
        this.grid.remove(trackRow.header);
        this.grid.remove(trackRow.closeButton);
        this.grid.remove(trackRow.resizeHandle);

        // remove track tiles from panels and release resources
        for (let panel of this.panels) {
            for (let track of trackRow.tracks) {
                panel.removeTrack(track);
            }
        }

        // release track tile resources
        for (let track of trackRow.tracks) {
            trackRow.deleteTrack(track);
        }

        // remove row from rows array
        let i = this.rows.length - 1;
        while (i >= 0) {
            let row = this.rows[i];
            if (row.trackRow === trackRow) {
                this.rows.splice(i, 1);
                break;
            }
            i--;
        }
    }

    /**
     * Removes the panel from the scene and cleans up resources
     *
     * **Should only be called after closePanel**
     */
    protected deletePanel = (panel: Panel) => {
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
        Animator.removeAnimationCompleteCallbacks(panel, 'layoutW', this.deletePanel);

        // remove the panel from the scene
        this.grid.remove(panel);

        // delete track tiles from the track
        // (we can leave them in the scene-graph of the panel and the GC should still cull them all)
        for (let track of panel.tracks) {
            panel.remove(track);
            for (let row of this.rows) {
                for (let t of row.trackRow.tracks) {
                    if (t === track) {
                        row.trackRow.deleteTrack(track);
                        break;
                    }
                }
            }
        }

        panel.releaseGPUResources();

        // strictly we don't need to do this but listener bugs may prevent the GC from clearing the panel
        panel.removeAllListeners(true);
    }

    protected layoutPanels(animate: boolean, singlePanelOnly?: Panel) {
        // count open panels
        let openPanelCount = 0;
        for (let panel of this.panels) if (!panel.closing) openPanelCount++;

        // panels are only closable if more than 1 are open
        for (let panel of this.panels) {
            panel.closable = openPanelCount > 1;
            panel.setResizable(panel.column < (this.panelEdges.length - 2) && !panel.closing);

            // animate panels to column positions
            if (singlePanelOnly === undefined || (singlePanelOnly === panel)) {
                let edges = this.panelEdges;
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
        }
    }

    protected layoutTrackRows(animate: boolean, singleTrackRowOnly?: TrackRow) {
        let y = 0;
        for (let row of this.rows) {
            let h = row.heightPx;
            let trackRow = row.trackRow;
            if (singleTrackRowOnly === undefined || (singleTrackRowOnly === trackRow)) {
                if (animate) {
                    Animator.springTo(trackRow, { y: y, h: h }, DEFAULT_SPRING);
                } else {
                    Animator.stop(trackRow, ['y', 'h']);
                    trackRow.y = y + this.rowOffsetY;
                    trackRow.h = h;
                }
            }

            y += row.heightPx;
        }

        // we manually set the grid height since it doesn't automatically wrap to content
        this.grid.h = y + this.spacing.y * 0.5 + this.rowOffsetY;
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


    // local state for grid-resizing
    private _resizingPanels = new Set<Panel>();
    private _resizingRows = new Set<{
        row: Row,
        initialHeightPx: number
    }>();

    protected initializeDragPanning() {
        let dragStartY: number = undefined;
        let yOffsetStart: number = undefined;
        this.addEventListener('dragstart', (e) => {
            dragStartY = e.localY;
            yOffsetStart = this.rowOffsetY;
        });

        this.addEventListener('dragmove', (e) => {
            if (this._resizingPanels.size > 0 || this._resizingRows.size > 0) return;
            let dy = e.localY - dragStartY;

            let maxOffset = 0;

            // determine minOffset from grid overflow
            // assumes grid.h is up to date (requires calling layoutTrackRows(false))
            let trackViewerHeight = this.getComputedHeight();
            let gridViewportHeight = trackViewerHeight - this.grid.y;

            // not a perfect technique but does the job
            let overflow = this.grid.h - gridViewportHeight - this.rowOffsetY;
            let minOffset = -overflow;

            this.rowOffsetY = Math.min(Math.max(yOffsetStart + dy, minOffset), maxOffset);

            this.layoutTrackRows(false);
        });
    }

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

        let localY0 = 0;

        this.grid.addInteractionListener('dragstart', (e) => {
            let resizing = (this._resizingPanels.size + this._resizingRows.size) > 0;
            if (resizing) {
                e.preventDefault();
                e.stopPropagation();
            }

            for (let panel of this._resizingPanels) {
                let i = panel.column + 1;
                draggedVEdges[i] = {
                    i: i,
                    p0: e.fractionX,
                    e0: this.panelEdges[i],
                    obj: panel,
                }
            }

            if (e.isPrimary && e.buttonState === 1) {
                localY0 = e.localY;
            }
        });

        this.grid.addInteractionListener('dragmove', (e) => {
            let resized = false;

            let resizing = (this._resizingPanels.size + this._resizingRows.size) > 0;
            if (resizing) {
                e.preventDefault();
                e.stopPropagation();
            }

            for (let k in draggedVEdges) {
                let s = draggedVEdges[k];
                let dx = e.fractionX - s.p0;
                let gridWidthPx = this.grid.getComputedWidth();
                let minFWidth = this.minPanelWidth / gridWidthPx;
                let min = ((this.panelEdges[s.i - 1] + minFWidth) || 0);
                let max = ((this.panelEdges[s.i + 1] - minFWidth) || 1);
                this.panelEdges[s.i] = Math.min(Math.max(s.e0 + dx, min), max);

                for (let p of this.panels) {
                    if ((p.column === s.i) || (p.column === (s.i - 1))) {
                        this.layoutPanels(false, p);
                    }
                }

                resized = true;
            }

            if (e.isPrimary) {
                for (let entry of this._resizingRows) {
                    let deltaY = e.localY - localY0;
                    entry.row.heightPx = Math.max(entry.initialHeightPx + deltaY, this.minTrackHeight);

                    resized = true;
                }
            }

            if (resized) {
                this.layoutTrackRows(false);
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
        });
    }

    protected startResizingPanel(panel: Panel) {
        this._resizingPanels.add(panel);
    }

    protected endResizingPanel(panel: Panel) {
        this._resizingPanels.delete(panel);
    }

    protected startResizingTrackRow(trackRow: TrackRow) {
        let row: Row = this.rows.find((r) => r.trackRow === trackRow);
        this._resizingRows.add({
            row: row,
            initialHeightPx: row.trackRow.h,
        });
    }

    protected endResizingTrackRow(trackRow: TrackRow) {
        for (let entry of this._resizingRows) {
            if (entry.row.trackRow === trackRow) {
                this._resizingRows.delete(entry);
            }
        }
    }

}

function AddPanelButton(props: {
    onClick: () => void,
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

function AddDataTrackButton(props: {
    onClick: () => void
}) {
    return <div
    style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
    }}
    >
        <div>
            <button 
                onClick={props.onClick}
                style={{
                    margin: '0 auto',
                    padding: '8px 16px',
                    borderRadius: '16px',
            }}>Add Track</button>
        </div>
    </div>
}

export default TrackViewer;