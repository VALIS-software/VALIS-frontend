import React = require("react");
import Object2D from "./core/Object2D";
import ReactObject from "./core/ReactObject";
import Rect from "./core/Rect";
import Text from "./core/Text";

import PanelDataModel from "../model/PanelDataModel";

import IconButton from 'material-ui/IconButton';
import SvgClose from "material-ui/svg-icons/navigation/close";
import TrackTile from "./TrackTile";
import { InteractionEvent } from "./core/InteractionEvent";
import { runInThisContext } from "vm";

const OpenSansRegular = require('./../font/OpenSans-Regular.msdf.bin');

export class Panel extends Object2D {

    column: number;
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
    readonly x1: number = 1;

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
        this.xAxis = new XAxis(this.x0, this.x1, 16);
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

        let x00: number = 0;
        let xf0 = 0.0;

        tile.addEventListener('dragstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            xf0 = e.fractionX;
            x00 = this.x0;
        });
        tile.addEventListener('dragmove', (e) => {
            e.preventDefault();
            e.stopPropagation();

            let range = this.x1 - this.x0;

            let dxf = e.fractionX - xf0;
            let x0 = x00 + range * (-dxf);
            let x1 = x0 + range;

            this.setRange(x0, x1);
        });

        tile.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();

            // pinch zoom
            if (e.ctrlKey) {
                let zoomFactor = 1 + e.wheelDeltaY * 0.01;
                let zoomCenterF = e.fractionX;

                let range = this.x1 - this.x0;

                let d0 = range * zoomCenterF;
                let d1 = range * (1 - zoomCenterF);
                let p = d0 + this.x0;

                let x0 = p - d0 * zoomFactor;
                let x1 = p + d1 * zoomFactor;

                this.setRange(x0, x1);
            }
        });

        this.fillX(tile);
        this.add(tile);
    }

    removeTrackTile(tile: TrackTile) {
        // @! need to clear event listeners
        // tile.removeEventListener('dragmove', this.onTileDragMove);
        // tile.removeEventListener('dragstart', this.onTileDragMove);
        tile.panel = null;
        this.remove(tile);
        throw '@! todo: clear event listeners';
    }

    setRange(x0: number, x1: number) {
        (this.x0 as any) = x0;
        (this.x1 as any) = x1;
        this.xAxis.setRange(x0, x1);

        // @! for each tile, setRange
        // for (let tile )
    }

    protected onTileDragMove = (e: InteractionEvent) =>{
        console.log('tile drag', e.fractionX);
        e.preventDefault();
        e.stopPropagation();
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

class XAxis extends Object2D {

    set fontSizePx(v: number) {
        this._fontSizePx = v;
        this.clearTextCache();
        this.updateLabels();
    }
    get fontSizePx() {
        return this._fontSizePx;
    }

    protected x0: number = 0;
    protected x1: number = 1;
    protected _fontSizePx: number;

    constructor(x0: number = 0, x1: number = 1, fontSizePx: number = 16, protected fontPath: string = OpenSansRegular) {
        super();
        this.render = false;
        this.x0 = x0;
        this.x1 = x1;
        this._fontSizePx = fontSizePx;
        this.updateLabels();
    }

    setRange(x0: number, x1: number) {
        this.x0 = x0;
        this.x1 = x1;
        this.updateLabels();
    }

    // valid for stable (fontSize, fontPath)
    protected _textCache: { [ str: string ]: {
        node: Text,
        used: boolean,
    } } = {};

    protected updateLabels() {
        let ticks = 100; // @! quick hack
        let range = this.x1 - this.x0;
        let dp = 1;

        // @! align with each 0.5
        // x0 to nearest 0.5
        // x = 0.142
        // Math.ceil((x * 2) /2;
        let n = 2;

        let s = range / (ticks - 1);

        let start0 = Math.ceil(this.x0 * n) / n;

        // reset 'used' flag in cache
        for (let str in this._textCache) {
            this._textCache[str].used = false;
        }

        for (let i = 0; i < ticks; i++) {
            let v = start0 + i * (1/n);

            if (v >  this.x1) break; // @! quick hack

            let m = Math.pow(10, dp);
            let str = (Math.round(v * m) / m).toString();

            let entry = this._textCache[str];

            if (entry === void 0) {
                let text = new Text(this.fontPath, str, this._fontSizePx);
                text.layoutX = -0.5;
                text.layoutY = -1;
                text.layoutParentY = 1;
                this.add(text);

                entry = this._textCache[str] = {
                    node: text,
                    used: true,
                }
            }

            entry.used = true;

            entry.node.layoutParentX = (v - this.x0)/range;
        }

        // remove unused labels
        for (let str in this._textCache) {
            let entry = this._textCache[str];
            if (!entry.used) {
                this.remove(entry.node);
                delete this._textCache[str];
            }
        }
    }

    protected clearTextCache() {
        this._textCache = {};
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