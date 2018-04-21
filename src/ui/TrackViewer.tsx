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
    protected defaultTrackHeight_px: number = 100;
    protected spacing = {
        x: 10,
        y: 10
    }

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
        for (let track of [
            {name: 'Sequence'},
            {name: 'GRCh38'},
            {name: 'GM12878-DNase'},
        ]) {
            this.addTrack(track);
        }

        for (let panel of [
            { name: 'PCSK9' },
            { name: 'HER2' },
            { name: 'MAOA' },
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

    // state deltas
    addTrack(model: TrackModel) {
        let edges = this.edges.horizontal;
        let newRowIndex = Math.max(edges.length - 1, 0);

        if (edges.length === 0) edges.push(0);
        let lastEdge = edges[edges.length - 1];
        edges.push(lastEdge + this.defaultTrackHeight_px);

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
        let panel = new Panel(model, newColumnIndex, this.removePanel, this.layoutPanel);
        // initialize tracks for this panel
        for (let i = 0; i < this.tracks.length; i++) {
            panel.trackTiles[i] = this.createTrackTile(this.tracks[i].model);
        }
        this.panels.push(panel);
        panel.header.y = 0;
        panel.header.h = this.panelHeaderHeight_px;
        this.columnHeaders.add(panel.header);

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
            this.positionPanel(p, animate);
        }
    }

    removePanel = (panel: Panel) => {
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
        
        Animator.springTo(panel, { layoutW: 0 }, this.springOptions);
        Animator.addAnimationCompleteCallback(panel, 'layoutW', this.cleanupPanel);

        // update column indexes of remaining panels
        for (let p of this.panels) {
            if (p.column > panel.column) {
                p.column = p.column - 1;
            }
        }

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
        trackTile.onPointerDown(() => {
            console.log('Pointer Down on track-tile')
        });
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
        this.layoutYInTrack(track.header, track);
        for (let j = 0; j < this.panels.length; j++) {
            let panel = this.panels[j];
            let trackTile = panel.trackTiles[track.row];
            this.layoutXInPanel(trackTile, panel);
            this.layoutYInTrack(trackTile, track);
        }
    }

    protected layoutPanel = (panel: Panel) => {
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

    constructor(readonly model: TrackModel, row: number, public onLayoutChanged: (t:Track) => void = () => {}) {
        this.row = row;
        this.header = new ReactObject(<TrackHeader track={this} />);
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

    constructor(readonly model: PanelModel, column: number, protected onClose: (t: Panel) => void, public onLayoutChanged: (t: Panel) => void = () => { }) {
        this.column = column;
        this.header = new ReactObject();
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