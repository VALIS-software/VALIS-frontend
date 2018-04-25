/* 
    - Track shouldn't use row to link with track tiles, since track tiles are permanently bound to a track
    - We've got a column-headers element but not a row headers element - why? Which approach is better
*/
import Object2D from "./core/Object2D";
import Rect from "./core/Rect";
import React = require("react");
import ReactObject from "./core/ReactObject";
import Animator from "../animation/Animator";

import IconButton from 'material-ui/IconButton';
import SvgClose from "material-ui/svg-icons/navigation/close";
import SvgAdd from "material-ui/svg-icons/content/add";

const SPRING_TENSION = 250;
 
class TrackViewer extends Object2D {

    protected trackHeaderWidth_px: number = 180;
    protected panelHeaderHeight_px: number = 50;
    protected defaultTrackHeight_px: number = 200;
    protected spacing = {
        x: 10,
        y: 10
    }

    protected minTrackHeightPx = 35;
    protected minPanelWidthPx = 35;

    protected springOptions = {
        tension: SPRING_TENSION,
        friction: Math.sqrt(SPRING_TENSION) * 2,
    }

    protected edges = {
        vertical: new Array<number>(),
        horizontal: new Array<number>(),
    }

    // be aware that the array index does not correspond to row or column
    protected tracks = new Array<Track>();
    protected panels = new Array<Panel>();

    protected grid: Object2D;
    protected columnHeaders: Object2D;

    protected addPanelButton: ReactObject;

    constructor() {
        super();
        this.render = false;

        // fill parent dimensions
        this.layoutW = 1;
        this.layoutH = 1;

        this.grid = new Object2D();
        this.add(this.grid);
        this.initializeGridResizing();

        this.columnHeaders = new Object2D();
        this.add(this.columnHeaders);
        this.addPanelButton = new ReactObject(
            <AddPanelButton onClick={() => {
                this.addPanel({ name: 'new' }, true);
            }} />,
            this.panelHeaderHeight_px,
            this.panelHeaderHeight_px
        );
        this.addPanelButton.x = this.spacing.x * 0.5;
        this.addPanelButton.layoutParentX = 1;
        this.columnHeaders.add(this.addPanelButton);

        // initialize with some dummy data
        let i = 0;
        for (let track of [
            {name: 'Sequence'},
            {name: 'GRCh38'},
            {name: 'GM12878-DNase'},
        ]) {
            this.addTrack(track, i++ === 0 ? 50 : undefined);
        }

        for (let panel of [
            { name: 'PCSK9' },
            // { name: 'HER2' },
            // { name: 'MAOA' },
        ]) {
            this.addPanel(panel, false);
        }

        this.layoutGridContainer();
    }

    protected onAdded() {
        super.onAdded();
        Animator.addStepCompleteCallback(this.onAnimationStep);
    }

    protected onRemoved() {
        super.onRemoved();
        Animator.removeStepCompleteCallback(this.onAnimationStep);
    }

    private _activeResizePanel: Panel = null;
    private _activeResizeTrack: Track = null;
    protected initializeGridResizing() {
        // drag state
        let c0 = -1;
        let r0 = -1;
        let x0 = 0;
        let y0 = 0;
        let ex0 = 0;
        let ey0 = 0;

        this.grid.addEventListener('dragstart', (e) => {
            e.preventDefault();

            if (this._activeResizePanel != null) {
                c0 = this._activeResizePanel.column;
                ex0 = this.edges.vertical[c0];
                x0 = e.fractionX;
            }

            if (this._activeResizeTrack != null) {
                r0 = this._activeResizeTrack.row + 1;
                ey0 = this.edges.horizontal[r0];
                y0 = e.localY;
            }
        });

        this.grid.addEventListener('dragmove', (e) => {
            e.preventDefault();

            if (this._activeResizePanel != null) {
                let dx = e.fractionX - x0;
                let gridWidthPx = this.grid.getComputedWidth();
                let minFWidth = this.minTrackHeightPx / gridWidthPx;
                let min = ((this.edges.vertical[c0 - 1] + minFWidth) || 0);
                let max = ((this.edges.vertical[c0 + 1] - minFWidth) || 1);
                this.edges.vertical[c0] = Math.min(Math.max(ex0 + dx, min), max);

                for (let p of this.panels) {
                    if ((p.column === c0) || (p.column === (c0 - 1))) {
                        this.positionPanel(p, false);
                    }
                }
            }

            if (this._activeResizeTrack != null) {
                let dy = e.localY - y0;
                let gridHeightPx = this.grid.getComputedHeight();
                let min = ((this.edges.horizontal[r0 - 1] + this.minTrackHeightPx) || 0);
                let max = ((this.edges.horizontal[r0 + 1] - this.minTrackHeightPx) || gridHeightPx);
                this.edges.horizontal[r0] = Math.min(Math.max(ey0 + dy, min), max);

                for (let t of this.tracks) {
                    if (t.row === r0 || (t.row === (r0 - 1))) {
                        this.positionTrack(t, false);
                    }
                }
            }
        });

        this.grid.addEventListener('dragend', (e) => {
            e.preventDefault();
            this._activeResizePanel = null;
            this._activeResizeTrack = null;
        });
    }

    // state deltas
    addTrack(model: TrackModel, heightPx: number = this.defaultTrackHeight_px) {
        let edges = this.edges.horizontal;
        let newRowIndex = Math.max(edges.length - 1, 0);

        if (edges.length === 0) edges.push(0);
        let lastEdge = edges[edges.length - 1];
        edges.push(lastEdge + heightPx);

        // create a tack and add the header element to the grid
        let track = new Track(model, newRowIndex, this.layoutTrack);
        // add track tile to all panels
        for (let i = 0; i < this.panels.length; i++) {
            this.panels[i].trackTiles[newRowIndex] = this.createTrackTile(model);
        }
        this.tracks.push(track);

        track.header.x = -this.trackHeaderWidth_px + this.spacing.x * 0.5;
        track.header.w = this.trackHeaderWidth_px;

        this.grid.add(track.header);
        this.grid.add(track.handle);

        track.handle.layoutW = 1;
        track.handle.z = 1;
        track.handle.addEventListener('dragstart', (e) => {
            this._activeResizeTrack = track;
        });
        track.setResizable(true);

        this.positionTrack(track, false);
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
        let panel = new Panel(model, newColumnIndex, (p) => this.removePanel(p), this.layoutPanel);
        // initialize tracks for this panel
        for (let i = 0; i < this.tracks.length; i++) {
            panel.trackTiles[i] = this.createTrackTile(this.tracks[i].model);
        }
        this.panels.push(panel);
        panel.header.y = 0;
        panel.header.h = this.panelHeaderHeight_px;
        this.columnHeaders.add(panel.header);
        panel.handle.layoutH = 1;
        panel.handle.z = 1;
        this.grid.add(panel.handle);

        panel.handle.addEventListener('dragstart', (e) => {
            this._activeResizePanel = panel;
        });

        // update header state
        let openPanelCount = 0;
        for (let p of this.panels) if (!p.closing) openPanelCount++;

        for (let p of this.panels) {
            p.closable = openPanelCount > 1;
        }

        // set initial position
        this.positionPanel(panel, false);

        // scale the edges down to fit within the grid space
        let multiplier = 1 / newEdge;
        for (let e = 0; e < edges.length; e++) {
            edges[e] *= multiplier;
        }

        // animate all panels to new edge coordinates
        for (let p of this.panels) {
            p.setResizable(p.column > 0);
            this.positionPanel(p, animate);
        }
    }

    removePanel(panel: Panel){
        if (panel.closing) {
            console.error(`Trying to remove already removed panel`);
            return;
        }

        let edges = this.edges.vertical;

        panel.closing = true;

        // remove column from edges
        this.removeColumnSpaceFill(edges, panel.column);

        // remove panel from set so that it no it is no longer affected by other actions
        this.positionPanel(panel, true);
        
        Animator.addAnimationCompleteCallback(panel, 'layoutW', this.cleanupPanel);
        Animator.springTo(panel, { layoutW: 0 }, this.springOptions);

        // update column indexes of remaining panels
        for (let p of this.panels) {
            if (p.column > panel.column) {
                p.column = p.column - 1;
            }

            p.setResizable(p.column > 0);
        }

        panel.setResizable(false);

        let openPanelCount = 0;
        for (let p of this.panels) if (!p.closing) openPanelCount++;

        // animate all other panels to new column positions
        for (let p of this.panels) {
            if (p === panel) continue;
            this.positionPanel(p, true);
            p.closable = openPanelCount > 1;
        }

        if (edges.length < 2) {
            edges.length = 0;
        }
    }

    protected cleanupPanel = (panel: Panel) => {
        Animator.stop(panel);
        Animator.removeAnimationCompleteCallback(panel, 'layoutW', this.cleanupPanel);

        // remove from panel list
        let idx = this.panels.indexOf(panel);
        if (idx === -1) {
            console.error('Cleanup executed twice on a panel');
            return;
        }
        this.panels.splice(idx, 1);
        // remove elements from the scene-graph
        this.grid.remove(panel.handle);
        panel.handle.removeAllListeners(true);
        this.columnHeaders.remove(panel.header);
        for (let i = 0; i < panel.trackTiles.length; i++) {
            this.removeTrackTile(panel.trackTiles[i]);
        }

        console.log('cleaned up panel', panel);
    }

    /**
     * Remove a column from a set of edges in a physically natural way; the edges either side together as if either side was expanding under spring forces to fill the empty space
     */
    removeColumnSpaceFill(edges: Array<number>, index: number) {
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

    protected createTrackTile(model: TrackModel): Object2D {
        let trackTile = new Rect(0, 0, [0, 0, 0, 1]);
        this.grid.add(trackTile);
        return trackTile;
    }

    protected removeTrackTile(trackTile: Object2D) {
        this.grid.remove(trackTile);
        trackTile.releaseGPUResources();
    }

    // @! needs better name?
    protected positionPanel(panel: Panel, animate: boolean) {
        let edges = this.edges.vertical;
        let layoutParentX = edges[panel.column];
        let layoutW = panel.closing ? panel.layoutW : edges[panel.column + 1] - edges[panel.column];
        if (animate) {
            Animator.springTo(panel, { layoutParentX: layoutParentX, layoutW: layoutW }, this.springOptions);
        } else {
            Animator.stop(panel, ['layoutParentX', 'layoutW']);
            panel.layoutParentX = layoutParentX;
            panel.layoutW = layoutW;
        }
    }

    protected positionTrack(track: Track, animate: boolean) {
        let edges = this.edges.horizontal;
        let y = edges[track.row];
        let h = edges[track.row + 1] - edges[track.row];
        if (animate) {
            Animator.springTo(track, { y: y, h: h }, this.springOptions);
        } else {
            Animator.stop(track, ['y', 'h']);
            track.y = y;
            track.h = h;
        }
    }

    // - Layout methods - //
    protected onAnimationStep = () => {
        let maxX = 1;
        for (let i = 0; i < this.panels.length; i++) {
            maxX = Math.max(this.panels[i].layoutParentX + this.panels[i].layoutW, maxX);
        }
        this.addPanelButton.layoutParentX = maxX;
    }

    protected layoutTrack = (track: Track) => {
        let handle = track.handle;
        handle.layoutY = -0.5;
        handle.h = this.spacing.y * 0.8;
        handle.y = track.y + track.h;

        this.layoutYInTrack(track.header, track);
        for (let j = 0; j < this.panels.length; j++) {
            let panel = this.panels[j];
            let trackTile = panel.trackTiles[track.row];
            this.layoutXInPanel(trackTile, panel);
            this.layoutYInTrack(trackTile, track);
        }
    }

    protected layoutPanel = (panel: Panel) => {
        let handle = panel.handle;
        handle.layoutParentX = panel.layoutParentX;
        handle.layoutX = -0.5;
        handle.layoutH = 1.0;
        handle.w = this.spacing.x * 0.8;

        this.layoutXInPanel(panel.header, panel);
        for (let i = 0; i < this.tracks.length; i++) {
            let track = this.tracks[i];
            let trackTile = panel.trackTiles[track.row];
            this.layoutXInPanel(trackTile, panel);
            this.layoutYInTrack(trackTile, track);
        }
    }

    protected layoutXInPanel(obj: Object2D, panel: Panel) {
        obj.layoutParentX = panel.layoutParentX;
        obj.layoutW = panel.layoutW;
        obj.x = this.spacing.x * 0.5;
        obj.w = -this.spacing.x;
    }

    protected layoutYInTrack(obj: Object2D, track: Track) {
        obj.y = track.y + this.spacing.y * 0.5;
        obj.h = track.h - this.spacing.y;
    }
    
    protected layoutGridContainer() {
        this.grid.x = this.trackHeaderWidth_px + this.spacing.x * 0.5;
        this.grid.w =
            -this.trackHeaderWidth_px - this.spacing.x
            -this.addPanelButton.w;
        this.grid.y = this.panelHeaderHeight_px + this.spacing.y * 0.5 + 30;
        this.grid.h = -this.panelHeaderHeight_px;
        this.grid.layoutW = 1;
        this.grid.layoutH = 1;

        this.columnHeaders.x = this.grid.x;
        this.columnHeaders.w = this.grid.w;
        this.columnHeaders.y = 0;
        this.columnHeaders.h = this.panelHeaderHeight_px;
        this.columnHeaders.layoutW = this.grid.layoutW;
        this.columnHeaders.layoutH = this.grid.layoutH;
    }

}

class Track {

    active: boolean = true;
    row: number;

    get y(): number { return this._y; }
    get h(): number { return this._h; }

    set y(v: number) { this._y = v; this.onLayoutChanged(this); }
    set h(v: number) { this._h = v; this.onLayoutChanged(this); }

    protected _y: number;
    protected _h: number;

    readonly header: Object2D;
    readonly handle: Rect;

    constructor(readonly model: TrackModel, row: number, public onLayoutChanged: (t:Track) => void = () => {}) {
        this.row = row;
        this.header = new ReactObject(<TrackHeader track={this} />);
        this.handle = new Rect(0, 0, [1, 0, 0, 1]);
        this.handle.render = false;
        this.setResizable(false);
    }

    setResizable(v: boolean) {
        this.handle.cursorStyle = v ? 'row-resize' : null;
        this.handle.color = new Float32Array(v ? [0, 1, 0, 1] : [0.3, 0.3, 0.3, 1]);
    }

}

class Panel {

    trackTiles = new Array<Object2D>();
    column: number;

    get layoutParentX(): number { return this._layoutParentX; }
    get layoutW(): number { return this._layoutW; }
    get closable(): boolean { return this._closable; }
    get closing(): boolean { return this._closing; }

    set layoutParentX(v: number) { this._layoutParentX = v; this.onLayoutChanged(this); }
    set layoutW(v: number) { this._layoutW = v; this.onLayoutChanged(this); }

    set closable(v: boolean) { this._closable = v; this.updatePanelHeader(); }
    set closing(v: boolean) { this._closing = v; this.updatePanelHeader(); }

    protected _layoutParentX: number = 0;
    protected _layoutW: number = 0;
    protected _closable: boolean = false;
    protected _closing: boolean = false;

    readonly header: ReactObject;
    readonly handle: Rect;

    constructor(readonly model: PanelModel, column: number, protected onClose: (t: Panel) => void, public onLayoutChanged: (t: Panel) => void = () => { }) {
        this.header = new ReactObject();
        this.handle = new Rect(0, 0, [1, 0, 0, 1]);
        this.handle.render = false;
        this.column = column;
        this.setResizable(false);
    }

    setResizable(v: boolean) {
        this.handle.cursorStyle = v ? 'col-resize' : null;
        this.handle.color = new Float32Array(v ? [0, 1, 0, 1] : [0.3, 0.3, 0.3, 1]);
    }

    protected updatePanelHeader() {
        this.header.content = <PanelHeader panel={this} enableClose={this._closable && !this.closing} onClose={this.onClose} />;
    }

}

type TrackModel = {
    name: string;
}

type PanelModel = {
    name: string
}

function TrackHeader(props: {
    track: Track
}) {
    return <div
        style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            color: '#e8e8e8',
            backgroundColor: '#171615',
            borderRadius: '8px 0px 0px 8px',
            fontSize: '15px',
            overflow: 'hidden',
            userSelect: 'none',
        }}
    >
        <div style={{
            position: 'absolute',
            width: '100%',
            textAlign: 'center',
            top: '50%',
            transform: 'translate(0, -50%)',
        }}>
            {props.track.model.name}
        </div>
    </div>
}

function PanelHeader(props: {
    panel: Panel,
    enableClose: boolean,
    onClose: (panel: Panel) => void
}) {
    return <div
        style={{
            position: 'relative',
            width: '100%',
            height: '100%',
            color: '#e8e8e8',
            backgroundColor: '#171615',
            borderRadius: '8px',
            fontSize: '12px',
            fontWeight: 200,
            overflow: 'hidden',
            userSelect: 'none',
        }}
    >
        <div style={{
            position: 'absolute',
            width: '100%',
            textAlign: 'center',
            top: '50%',
            transform: 'translate(0, -50%)',
        }}>
            {props.panel.model.name}
        </div>
        {props.enableClose ?
            <div style={{
                position: 'absolute',
                width: '100%',
                textAlign: 'right',
                top: '50%',
                transform: 'translate(0, -50%)',
            }}>
                <IconButton onClick={() => props.onClose(props.panel)}>
                    <SvgClose color='rgb(171, 171, 171)' hoverColor='rgb(255, 255, 255)' />
                </IconButton>
            </div>

            : null
        }
    </div>
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