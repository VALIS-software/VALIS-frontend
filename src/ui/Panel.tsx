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
        // if range is not a finite number then default to 0 - 1
        x0 = isFinite(x0) ? x0 : 0;
        x1 = isFinite(x1) ? x1 : 0;

        (this.x0 as any) = x0;
        (this.x1 as any) = x1;

        this.xAxis.setRange(x0, x1);

        // @! for each tile, setRange
        // for (let tile )
    }

    protected onTileDragMove = (e: InteractionEvent) =>{
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

    maxTextLength: number = 4;
    maxMajorTicks: number = 10000; // failsafe to avoid rendering hangs

    set fontSizePx(v: number) {
        this._fontSizePx = v;
        this.labelCacheClear();
        this.labelsNeedUpdate = true;
    }
    get fontSizePx() {
        return this._fontSizePx;
    }

    protected x0: number = 0;
    protected x1: number = 1;
    protected _fontSizePx: number;
    protected labelsNeedUpdate: boolean;
    protected lastComputedWidth: number;

    constructor(x0: number = 0, x1: number = 1, fontSizePx: number = 16, protected fontPath: string = OpenSansRegular) {
        super();
        this.render = false;
        this.x0 = x0;
        this.x1 = x1;
        this._fontSizePx = fontSizePx;
        this.labelsNeedUpdate = true;
    }

    setRange(x0: number, x1: number) {
        this.labelsNeedUpdate = this.labelsNeedUpdate || this.x0 !== x0 || this.x1 !== x1;
        this.x0 = x0;
        this.x1 = x1;
    }

    applyTreeTransforms(root?: boolean) {
        this.labelsNeedUpdate = this.labelsNeedUpdate || this.getComputedWidth() !== this.lastComputedWidth;

        if (this.labelsNeedUpdate) {
            this.updateLabels();
        }

        super.applyTreeTransforms(root);        
    }

    formatValue(x: number, maxLength: number) {
        let str = x.toString();

        if (str.length > maxLength) {
            // if default print of string is too long, try to reduce it with a exponent symbol
            let exp10 = this.log10(Math.abs(x));
            let expSign = this.sign(exp10);
            let exp1000Int = Math.floor(Math.abs(exp10 / 3)) * expSign;

            let symbol = XAxis.siPrefixes[exp1000Int.toFixed(0)];
            let reductionFactor = Math.pow(1000, exp1000Int);

            if (symbol === void 0) {
                let exp10Int = Math.floor(Math.abs(exp10)) * expSign;
                symbol = exp10Int <= 3 ? '' : 'e' + exp10Int.toFixed(0);
            }

            let reducedX = x / reductionFactor;
            let reducedXIntStr = Math.round(reducedX).toString();
            let dp = maxLength - reducedXIntStr.length - symbol.length;
            let mStr = dp > 0 ? reducedX.toFixed(dp) : reducedXIntStr;
            str = mStr + symbol;
        }

        return str;
    }

    // valid for stable (fontSize, fontPath)
    protected _labelCache: {
        [ key: string ]: {
        label: Label,
        used: boolean,
    } } = {};

    protected labelCacheClear() {
        this._labelCache = {};
    }

    protected labelCacheGet(value: number, str: string) {
        let key = value.toString() + '_' + str;

        let entry = this._labelCache[key];

        if (entry === void 0) {
            let label = new Label(this.fontPath, str, this.fontSizePx);
            label.layoutParentY = 1;
            this.add(label);

            entry = this._labelCache[key] = {
                label: label,
                used: true,
            }
        }

        entry.used = true;

        return entry;
    }

    protected labelCacheMarkAllUnused() {
        // reset 'used' flag in cache
        for (let key in this._labelCache) {
            this._labelCache[key].used = false;
        }
    }

    protected labelCacheDeleteUnused() {
        for (let key in this._labelCache) {
            let entry = this._labelCache[key];
            if (!entry.used) {
                entry.label.releaseGPUResources();
                this.remove(entry.label);
                delete this._labelCache[key];
            }
        }
    }

    protected updateLabels() {
        this.labelCacheMarkAllUnused();

        // guard case where we cannot display anything
        let range = this.x1 - this.x0;
        if (range === 0) {
            this.labelCacheDeleteUnused();
            return;
        }

        const tickSpacingPx = 80 * 2;
        const rangeWidthPx = this.getComputedWidth(); // @! synchronization issues
        const tickRatio = tickSpacingPx / rangeWidthPx;
        const snap = 5;

        // @! problem is we're dealing in absolute space too much
        // we should convert to absolute space only when displaying text

        // let t0x = tickRatio * range; // x-space location of first tick after 0

        let n = this.log2(tickRatio * range / snap);

        let lMajor = Math.ceil(n);
        let lMinor = Math.floor(n);
        let a = n - lMinor; // current mix between lMinor and lMajor

        let transitionSharpness = 5; // from 0 to Infinity
        let minorAlpha = Math.pow((1 - a), transitionSharpness); // exponent is used to sharpen the transition

        let xMajorSpacing = (snap * Math.pow(2, lMajor)); // cannot use bitwise arithmetic because we're limited to 32 bits in js
        let xMinorSpacing = (snap * Math.pow(2, lMinor)) * 2;

        let firstDisplayTick = Math.floor(this.x0 / xMajorSpacing);
        let lastDisplayTick = Math.ceil(this.x1 / xMajorSpacing);

        let ticksRemaining = this.maxMajorTicks;
        for (let i = firstDisplayTick; i <= lastDisplayTick && ticksRemaining > 0; i++) {
            ticksRemaining--;

            let xMinor = xMinorSpacing * (i + 0.5);
            let xMajor = xMajorSpacing * i;

            let minorParentX = (xMinor - this.x0) / range;
            if (minorParentX >= 0 && minorParentX <= 1) { // @! temporary simple bounds clipping
                let textMinor = this.labelCacheGet(xMinor, this.formatValue(xMinor, this.maxTextLength));
                textMinor.label.layoutParentX = minorParentX;
                textMinor.label.setColor(0, 0, 0, minorAlpha);
            }

            let majorParentX = (xMajor - this.x0) / range;
            if (majorParentX >= 0 && majorParentX <= 1) {
                let textMajor = this.labelCacheGet(xMajor, this.formatValue(xMajor, this.maxTextLength));
                textMajor.label.layoutParentX = majorParentX;
                textMajor.label.setColor(0, 0, 0, 1);
            }
        }

        this.labelCacheDeleteUnused();
        this.labelsNeedUpdate = false;
        this.lastComputedWidth = this.getComputedWidth();
    }

    protected log2(x: number) {
        return Math.log(x) / Math.LN2;
    }

    protected log10(x: number) {
        return Math.log(x) / Math.LN10;
    }

    protected sign(x: number) {
        return (((x > 0) as any) - ((x < 0) as any)) || +x;
    }

    static siPrefixes: { [key: string]: string } = {
        '8': 'Y', // yotta
        '7': 'Z', // zetta
        '6': 'E', // exa
        '5': 'P', // peta
        '4': 'T', // tera
        '3': 'G', // giga
        '2': 'M', // mega
        '1': 'k', // kilo
        '-1': 'm', // milli
        '-2': 'µ', // micro
        '-3': 'n', // nano
        '-4': 'p', // pico
        '-5': 'f', // femto
        '-6': 'a', // atto
        '-7': 'z', // zepto
        '-8': 'y', // yocto
    };

}

class Label extends Object2D {

    text: Text;
    tick: Rect;

    constructor(fontPath: string, string: string, fontSizePx: number) {
        super();
        let tickHeightPx = 5;
        let tickWidthPx = 1;

        this.text = new Text(fontPath, string, fontSizePx);
        this.text.layoutX = -0.5;
        this.text.layoutY = -1;
        this.text.y = -tickHeightPx - 3;
        this.add(this.text);

        this.tick = new Rect(tickWidthPx, tickHeightPx);
        this.tick.layoutX = -0.5;
        this.tick.layoutY = -1;
        this.add(this.tick);

        this.render = false;
        this.setColor(0, 0, 0, 1);
    }

    setColor(r: number, g: number, b: number, a: number) {
        this.text.color.set([r, g, b, a]);
        this.tick.color.set([r, g, b, a * 0.5]);
    }

    releaseGPUResources() {
        this.text.releaseGPUResources();
        this.tick.releaseGPUResources();
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