import Object2D from "./core/Object2D";
import Rect from "./core/Rect";
import Text from "./core/Text";
import { Renderable } from "../rendering/Renderable";
import { BlendMode } from "../rendering/Renderer";

const OpenSansRegular = require('./../font/OpenSans-Regular.msdf.bin');

export class XAxis extends Object2D {

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

    protected clippingMask: Rect;

    constructor(x0: number = 0, x1: number = 1, fontSizePx: number = 16, protected fontPath: string = OpenSansRegular) {
        super();
        this.render = false;
        this.x0 = x0;
        this.x1 = x1;
        this._fontSizePx = fontSizePx;
        this.labelsNeedUpdate = true;

        this.clippingMask = new Rect(0, 0, [0.9, 0.9, 0.9, 1]);
        this.clippingMask.layoutW = 1;
        this.clippingMask.layoutH = 1;
        this.clippingMask.visible = false;
        this.add(this.clippingMask);
    }

    setRange(x0: number, x1: number) {
        this.labelsNeedUpdate = this.labelsNeedUpdate || this.x0 !== x0 || this.x1 !== x1;
        this.x0 = x0;
        this.x1 = x1;
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

    // override applyTreeTransforms to call updateLabels so that it's applied when world-space layouts are known
    applyTreeTransforms(root?: boolean) {
        this.labelsNeedUpdate = this.labelsNeedUpdate || this.getComputedWidth() !== this.lastComputedWidth;

        if (this.labelsNeedUpdate) {
            this.updateLabels();
        }

        super.applyTreeTransforms(root);
    }

    protected createLabel(str: string) {
        let label = new Label(this.fontPath, str, this.fontSizePx);
        label.layoutParentY = 1;
        label.z = 0.1;
        label.setMask(this.clippingMask);
        this.add(label);
        return label;
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
        let a = (n - lMinor); // current mix between lMinor and lMajor

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
            let textMinor = this.labelCacheGet(xMinor, this.formatValue(xMinor, this.maxTextLength));
            textMinor.label.layoutParentX = minorParentX;
            textMinor.label.setColor(0, 0, 0, minorAlpha);

            let majorParentX = (xMajor - this.x0) / range;
            let textMajor = this.labelCacheGet(xMajor, this.formatValue(xMajor, this.maxTextLength));
            textMajor.label.layoutParentX = majorParentX;
            textMajor.label.setColor(0, 0, 0, 1);
        }

        this.labelCacheDeleteUnused();
        this.labelsNeedUpdate = false;
        this.lastComputedWidth = this.getComputedWidth();
    }

    // valid for stable (fontSize, fontPath)
    protected _labelCache: {
        [key: string]: {
            label: Label,
            used: boolean,
        }
    } = {};

    protected labelCacheClear() {
        this._labelCache = {};
    }

    protected labelCacheGet(value: number, str: string) {
        let key = value.toString() + '_' + str;

        let entry = this._labelCache[key];

        if (entry === void 0) {
            let label = this.createLabel(str);

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
        this.tick.blendMode = BlendMode.PREMULTIPLIED_ALPHA;
        this.add(this.tick);

        this.render = false;
        this.setColor(0, 0, 0, 1);
    }

    setColor(r: number, g: number, b: number, a: number) {
        this.text.color.set([r, g, b, a]);
        this.tick.color.set([r, g, b, a * 0.5]);
    }

    setMask(mask: Renderable<any>) {
        this.text.mask = mask;
        this.tick.mask = mask;
    }

    releaseGPUResources() {
        this.text.releaseGPUResources();
        this.tick.releaseGPUResources();
    }

}

export default XAxis;