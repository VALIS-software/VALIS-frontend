import React = require("react");
import Object2D from "./core/Object2D";
import TrackTile from "./TrackTile";
import ReactObject from "./core/ReactObject";
import Rect from "./core/Rect";

import TrackDataModel from "../model/TrackDataModel";

export class Track {

    row: number;

    readonly tiles = new Array<TrackTile>();
    readonly header: Object2D;
    readonly resizeHandle: Rect;

    get y(): number { return this._y; }
    get h(): number { return this._h; }

    set y(v: number) { this._y = v; this.onLayoutChanged(this); }
    set h(v: number) { this._h = v; this.onLayoutChanged(this); }

    protected _y: number;
    protected _h: number;

    constructor(
        readonly model: TrackDataModel,
        row: number,
        public onLayoutChanged: (t: Track) => void = () => { },
        protected readonly spacing: { x: number, y: number }
    ) {
        this.row = row;
        this.header = new ReactObject(<TrackHeader track={ this} />);
        this.resizeHandle = new Rect(0, 0, [1, 0, 0, 1]);
        this.resizeHandle.h = this.spacing.y;
        this.resizeHandle.z = 1;
        this.resizeHandle.render = false;
        this.setResizable(false);
    }

    setResizable(v: boolean) {
        this.resizeHandle.cursorStyle = v ? 'row-resize' : null;
        this.resizeHandle.color.set(v ? [0, 1, 0, 1] : [0.3, 0.3, 0.3, 1]);
    }

    createTrackTile() {
        let tile = new TrackTile(this, [0, 0, 0, 1]);
        this.tiles.push(tile);
        return tile;
    }

    deleteTrackTile(tile: TrackTile) {
        tile.releaseGPUResources();
        let i = this.tiles.indexOf(tile);
        if (i === -1) return false;
        this.tiles.splice(i, 1);
        return true;
    }

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

export default Track;