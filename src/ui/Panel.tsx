import React = require("react");
import Object2D from "./core/Object2D";
import ReactObject from "./core/ReactObject";
import Rect from "./core/Rect";

import PanelDataModel from "../model/PanelDataModel";

import IconButton from 'material-ui/IconButton';
import SvgClose from "material-ui/svg-icons/navigation/close";
import TrackTile from "./TrackTile";
import { InteractionEvent, WheelInteractionEvent } from "./core/InteractionEvent";
import { runInThisContext } from "vm";
import XAxis from "./XAxis";

export class Panel extends Object2D {

    column: number;
    maxRange: number = 1e10;
    minRange: number = 1;

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

    protected tiles = new Set<TrackTile>();

    constructor(
        readonly model: PanelDataModel,
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
        this.xAxis = new XAxis(this.x0, this.x1, 11);
        this.xAxis.h = this.xAxisHeight;
        this.xAxis.layoutY = -1;
        this.fillX(this.xAxis);
        this.add(this.xAxis);

        this.resizeHandle = new Rect(0, 0, [1, 0, 0, 1]);
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
    }

    setResizable(v: boolean) {
        // handle should only be in the scene-graph if it's resizable
        this.remove(this.resizeHandle);
        if (v) this.add(this.resizeHandle);
        this.resizeHandle.cursorStyle = v ? 'col-resize' : null;
        this.resizeHandle.color.set(v ? [0, 1, 0, 1] : [0.3, 0.3, 0.3, 1]);
    }

    addTrackTile(tile: TrackTile) {
        if (tile.panel != null) {
            console.error('A track tile has been added to ' + (tile.panel === this ? 'the same panel more than once' : 'multiple panels'));
            tile.panel.remove(tile);
        }

        tile.panel = this;

        tile.addEventListener('dragstart', this.onTileDragStart);
        tile.addEventListener('dragmove', this.onTileDragMove);
        tile.addEventListener('wheel', this.onTileWheel);

        this.fillX(tile);
        this.add(tile);

        this.tiles.add(tile);
    }

    removeTrackTile(tile: TrackTile) {
        tile.removeEventListener('dragstart', this.onTileDragStart);
        tile.removeEventListener('dragmove', this.onTileDragMove);
        tile.removeEventListener('wheel', this.onTileWheel);

        tile.panel = null;
        this.remove(tile);

        this.tiles.delete(tile);
    }

    setRange(x0: number, x1: number) {
        // if range is not a finite number then default to 0 - 1
        x0 = isFinite(x0) ? x0 : 0;
        x1 = isFinite(x1) ? x1 : 0;

        (this.x0 as any) = x0;
        (this.x1 as any) = x1;

        this.xAxis.setRange(x0, x1);

        // @! for each tile, setRange
        // for (let tile )
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

        let range = this.x1 - this.x0;

        // clamp zoomFactor to range limits
        if (range * zoomFactor > this.maxRange) {
            zoomFactor = this.maxRange / range;
        }
        if (range * zoomFactor < this.minRange) {
            zoomFactor = this.minRange / range;
        }

        let d0 = range * zoomCenterF;
        let d1 = range * (1 - zoomCenterF);
        let p = d0 + this.x0;

        let x0 = p - d0 * zoomFactor;
        let x1 = p + d1 * zoomFactor;

        this.setRange(x0, x1);
    }

    // drag state
    protected _dragXF0: number;
    protected _dragX00: number;
    protected onTileDragStart = (e: InteractionEvent) => {
        e.preventDefault();
        e.stopPropagation();
        this._dragXF0 = e.fractionX;
        this._dragX00 = this.x0;
    }

    protected onTileDragMove = (e: InteractionEvent) =>{
        e.preventDefault();
        e.stopPropagation();

        let range = this.x1 - this.x0;

        let dxf = e.fractionX - this._dragXF0;
        let x0 = this._dragX00 + range * (-dxf);
        let x1 = x0 + range;

        this.setRange(x0, x1);
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