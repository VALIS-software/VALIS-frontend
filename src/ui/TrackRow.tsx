import React = require("react");
import TrackModel from "../model/TrackModel";
import Object2D from "./core/Object2D";
import ReactObject from "./core/ReactObject";
import Rect from "./core/Rect";
import Track from "./tracks/Track";
import ConstructTrack from "./tracks/ConstructTrack";

export class TrackRow {

    readonly tracks = new Set<Track>();
    readonly header: Object2D;
    readonly resizeHandle: Rect;

    get y(): number { return this._y; }
    get h(): number { return this._h; }

    set y(v: number) { this._y = v; this.layoutY(); }
    set h(v: number) { this._h = v; this.layoutY(); }

    protected _y: number;
    protected _h: number;

    constructor(
        readonly model: TrackModel,
        protected readonly spacing: { x: number, y: number }
    ) {
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

    createTrack() {
        let track: Track = ConstructTrack(this.model);
        this.tracks.add(track);
        this.layoutY();
        return track;
    }

    deleteTrack(track: Track) {
        track.releaseGPUResources();
        return this.tracks.delete(track);
    }

    /**
     * A TrackRow isn't an Object2D so we manually layout track elements with the track row's y and height
     */
    protected layoutY() {
        // handle
        let handle = this.resizeHandle;
        handle.layoutY = -0.5;
        handle.y = this.y + this.h;

        // header
        this.header.y = this.y + this.spacing.y * 0.5;
        this.header.h = this.h - this.spacing.y;

        // tiles
        for (let track of this.tracks) {
            track.y = this.y + this.spacing.y * 0.5;
            track.h = this.h - this.spacing.y;
        }
    }

}

function TrackHeader(props: {
    track: TrackRow
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

export default TrackRow;