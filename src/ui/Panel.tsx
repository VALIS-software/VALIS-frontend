import React = require("react");
import Object2D from "./core/Object2D";
import ReactObject from "./core/ReactObject";
import Rect from "./core/Rect";

import PanelModel from "../model/PanelModel";

import IconButton from "material-ui/IconButton";
import SvgClose from "material-ui/svg-icons/navigation/close";
import Track, { AxisPointerStyle } from "./tracks/Track";
import { InteractionEvent, WheelInteractionEvent } from "./core/InteractionEvent";
import { runInThisContext } from "vm";
import XAxis from "./XAxis";
import { OpenSansRegular } from "./font/Fonts";

export class Panel extends Object2D {

    column: number;
    maxRange: number = 1e10;
    minRange: number = 10;

    readonly header: ReactObject;
    readonly xAxis: XAxis;
    readonly resizeHandle: Rect;

    get closable(): boolean { return this._closable; }
    get closing(): boolean { return this._closing; }

    set closable(v: boolean) {
        this._closable = v;
        this.updatePanelHeader();
    }
    set closing(v: boolean) {
        this._closing = v;
        this.updatePanelHeader();
    }

    protected _closable = false;
    protected _closing = false;

    // view model state
    // viewport is designed to weight high precision to relatively small values (~millions) and lose precision for high values (~billions+)
    readonly x0: number = 0; // these should only be changed by setRange()
    readonly x1: number = 1e6;

    protected tracks = new Set<Track>();

    protected activeAxisPointers: { [ pointerId: string ]: number } = {};
    protected secondaryAxisPointers: { [pointerId: string]: number } = {};

    protected tileDragging = false;
    protected tileHovering = false;

    constructor(
        readonly model: PanelModel,
        column: number,
        protected onClose: (t: Panel) => void,
        protected readonly spacing: { x: number, y: number },
        protected readonly panelHeaderHeight: number,
        protected readonly xAxisHeight: number,
    ) {
        super();
        // a panel has nothing to render on its own
        this.render = false;

        this.column = column;

        this.header = new ReactObject();
        this.fillX(this.header);
        this.header.h = this.panelHeaderHeight;
        this.header.layoutY = -1;
        this.header.y = -this.xAxisHeight - this.spacing.y * 0.5;
        this.add(this.header);

        // 1/2 spacing around the x-axis
        let offset = 0.5; // offset labels by 0.5 to center on basepairs
        this.xAxis = new XAxis(this.x0, this.x1, 11, OpenSansRegular, offset, 1, 1);
        this.xAxis.minDisplay = 0;
        this.xAxis.maxDisplay = Infinity;
        this.xAxis.h = this.xAxisHeight;
        this.xAxis.layoutY = -1;
        this.fillX(this.xAxis);
        this.add(this.xAxis);

        this.resizeHandle = new Rect(0, 0, [1, 0, 0, 1]);
        this.resizeHandle.layoutX = -0.5;
        this.resizeHandle.layoutX = -0.5;
        this.resizeHandle.layoutParentX = 1;
        this.resizeHandle.layoutParentX = 1;
        this.resizeHandle.w = this.spacing.x;
        this.resizeHandle.layoutH = 1;
        this.resizeHandle.z = 1;
        this.resizeHandle.render = false;
        this.setResizable(false);

        this.setRange(model.x0, model.x1);
    }

    setResizable(v: boolean) {
        // handle should only be in the scene-graph if it's resizable
        this.remove(this.resizeHandle);
        if (v) this.add(this.resizeHandle);
        this.resizeHandle.cursorStyle = v ? 'col-resize' : null;
        this.resizeHandle.color.set(v ? [0, 1, 0, 1] : [0.3, 0.3, 0.3, 1]);
    }

    addTrack(track: Track) {
        if (track.panel != null) {
            console.error('A track tile has been added to ' + (track.panel === this ? 'the same panel more than once' : 'multiple panels'));
            track.panel.remove(track);
        }

        track.panel = this;
        
        track.addInteractionListener('dragstart', this.onTileDragStart);
        track.addInteractionListener('dragmove', this.onTileDragMove);
        track.addInteractionListener('dragend', this.onTileDragEnd);
        track.addInteractionListener('wheel', this.onTileWheel);
        track.addInteractionListener('pointermove', this.onTilePointerMove);
        track.addInteractionListener('pointerleave', this.onTileLeave);

        track.setRange(this.x0, this.x1);

        this.fillX(track);
        this.add(track);

        this.tracks.add(track);
    }

    removeTrack(track: Track) {
        track.removeInteractionListener('dragstart', this.onTileDragStart);
        track.removeInteractionListener('dragmove', this.onTileDragMove);
        track.removeInteractionListener('dragend', this.onTileDragEnd);
        track.removeInteractionListener('wheel', this.onTileWheel);
        track.removeInteractionListener('pointermove', this.onTilePointerMove);
        track.removeInteractionListener('pointerleave', this.onTileLeave);

        track.panel = null;
        this.remove(track);

        this.tracks.delete(track);
    }

    setRange(x0: number, x1: number) {
        // if range is not a finite number then default to 0 - 1
        x0 = isFinite(x0) ? x0 : 0;
        x1 = isFinite(x1) ? x1 : 0;

        (this.x0 as any) = x0;
        (this.x1 as any) = x1;


        this.xAxis.setRange(x0, x1);
        
        // control axis text length by number of visible base pairs
        // when viewing a small number of bases the exact span is likely required
        let span = x1 - x0;
        if (span < 150) {
            this.xAxis.maxTextLength = Infinity;
        } else if (span < 1e5) {
            this.xAxis.maxTextLength = 6;
        } else {
            this.xAxis.maxTextLength = 4;
        }

        for (let tile of this.tracks) {
            tile.setRange(x0, x1);
        }
    }

    setSecondaryAxisPointers(secondaryAxisPointers: { [ pointerId: string ]: number }) {
        // remove any old and unused axis pointers
        for (let pointerId in this.secondaryAxisPointers) {
            if (secondaryAxisPointers[pointerId] === undefined && this.activeAxisPointers[pointerId] === undefined) {
                for (let tile of this.tracks) {
                    tile.removeAxisPointer(pointerId);
                }
            }
        }

        // add or update secondary axis pointers
        for (let pointerId in secondaryAxisPointers) {
            // if this panel has this pointer as an active axis pointer, skip it
            if (this.activeAxisPointers[pointerId] !== undefined) {
                continue;
            }

            let absX = secondaryAxisPointers[pointerId];

            let span = this.x1 - this.x0;
            let fractionX = (absX - this.x0) / span;

            this.secondaryAxisPointers[pointerId] = absX;

            for (let tile of this.tracks) {
                tile.setAxisPointer(pointerId, fractionX, AxisPointerStyle.Secondary);
            }
        }
    }

    protected onTileLeave = (e: InteractionEvent) => {
        this.tileHovering = false;
        if (!this.tileDragging) {
            this.removeActiveAxisPointer(e);
        }
    }

    protected onTilePointerMove = (e: InteractionEvent) => {
        this.tileHovering = true;
        this.setActiveAxisPointer(e);
    }

    protected onTileWheel = (e: WheelInteractionEvent) => {
        e.preventDefault();
        e.stopPropagation();

        let zoomFactor = 1;

        // pinch zoom
        if (e.ctrlKey) {
            zoomFactor = 1 + e.wheelDeltaY * 0.01; // I'm assuming mac trackpad outputs change in %, @! needs research
        } else {
            zoomFactor = 1 + e.wheelDeltaY * 0.01 * 0.15;
        }

        let zoomCenterF = e.fractionX;

        let span = this.x1 - this.x0;

        // clamp zoomFactor to range limits
        if (span * zoomFactor > this.maxRange) {
            zoomFactor = this.maxRange / span;
        }
        if (span * zoomFactor < this.minRange) {
            zoomFactor = this.minRange / span;
        }

        let d0 = span * zoomCenterF;
        let d1 = span * (1 - zoomCenterF);
        let p = d0 + this.x0;

        let x0 = p - d0 * zoomFactor;
        let x1 = p + d1 * zoomFactor;

        this.setRange(x0, x1);
    }

    // drag state
    protected _dragXF0: number;
    protected _dragX00: number;
    protected onTileDragStart = (e: InteractionEvent) => {
        if (e.buttonState !== 1) return;

        e.preventDefault();
        e.stopPropagation();
        this._dragXF0 = e.fractionX;
        this._dragX00 = this.x0;

        this.tileDragging = true;
    }

    protected onTileDragMove = (e: InteractionEvent) => {
        if (e.buttonState !== 1) return;

        e.preventDefault();
        e.stopPropagation();

        this.tileDragging = true;

        let span = this.x1 - this.x0;

        let dxf = e.fractionX - this._dragXF0;
        let x0 = this._dragX00 + span * (-dxf);
        let x1 = x0 + span;

        this.setRange(x0, x1);

        this.setActiveAxisPointer(e);
    }

    protected onTileDragEnd = (e: InteractionEvent) => {
        e.preventDefault();
        e.stopPropagation();

        this.tileDragging = false;

        if (!this.tileHovering) {
            this.removeActiveAxisPointer(e);
        }
    }

    protected setActiveAxisPointer(e: InteractionEvent) {
        let fractionX = e.fractionX;
        let span = this.x1 - this.x0;
        let axisPointerX = span * fractionX + this.x0;

        this.activeAxisPointers[e.pointerId] = axisPointerX;

        for (let tile of this.tracks) {
            tile.setAxisPointer(e.pointerId.toString(), fractionX, AxisPointerStyle.Active);
        }

        // broadcast active axis pointer change
        this.eventEmitter.emit('axisPointerUpdate', this.activeAxisPointers);
    }

    protected removeActiveAxisPointer(e: InteractionEvent) {
        if (this.activeAxisPointers[e.pointerId] === undefined) {
            return;
        }

        delete this.activeAxisPointers[e.pointerId];

        for (let tile of this.tracks) {
            tile.removeAxisPointer(e.pointerId.toString());
        }

        this.eventEmitter.emit('axisPointerUpdate', this.activeAxisPointers);
    }

    protected fillX(obj: Object2D) {
        obj.x = this.spacing.x * 0.5;
        obj.layoutX = 0;
        obj.layoutParentX = 0;
        obj.layoutW = 1;
        obj.w = -this.spacing.x;
    }

    protected updatePanelHeader() {
        this.header.content = <PanelHeader panel={ this } enableClose = { this._closable && !this.closing } onClose = { this.onClose } />;
    }

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
            whiteSpace: 'nowrap',
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

export default Panel;