import { Track } from "../Track";
import { Scalar } from "../../math/Scalar";
import TileEngine, { TileEntry, TileState } from "./TileEngine";
import { TrackDataModel } from "../../model/TrackDataModel";

export class SequenceTrack extends Track {

    // protected activeAxisPointerColor = [1, 0.8, 0.8, 1];
    // protected secondaryAxisPointerColor = [1, 0.3, 0.3, 1];

    constructor(model: TrackDataModel) {
        super(model);
        this.color.set([0,0,0,1]);
    }

    setRange(x0: number, x1: number) {
        super.setRange(x0, x1);
        this.updateTiles();
    }

    applyTreeTransforms(root?: boolean) {
        this.updateTiles();
        super.applyTreeTransforms(root);
    }

    private _lastComputedWidth: number;
    private _lastX0: number;
    private _lastX1: number;

    protected _tileNodeCache = new UsageCache<TileNode>();

    protected updateTiles() {
        const widthPx = this.getComputedWidth();
        const x0 = this.x0;
        const x1 = this.x1;
        const span = x1 - x0;

        let widthChanged = this._lastComputedWidth !== widthPx;
        let rangeChanged = this._lastX0 !== x0 || this._lastX1 !== x1;

        if (!widthChanged && !rangeChanged) {
            return;
        }

        this._lastX0 = x0;
        this._lastX1 = x1;
        this._lastComputedWidth = widthPx;

        this._tileNodeCache.markAllUnused();

        if (widthPx > 0) {
            let densityMultiplier = 2.0;

            let basePairsPerDOMPixel = (span / widthPx);
            let samplingDensity = densityMultiplier * basePairsPerDOMPixel / App.canvasPixelRatio;
            let displayLodLevel = Scalar.log2(Math.max(samplingDensity, 1));
            let lodLevel = Math.floor(displayLodLevel);

            TileEngine.getTiles(this.model.sourceId, x0, x1, samplingDensity, true, (tileData) => {
                let tileKey = this.getTileKey(tileData);

                let tileNode = this._tileNodeCache.get(tileKey, this.createTileNode);
                this.updateTileNode(tileNode, tileData, x0, span, displayLodLevel);

                // main tiles are positioned front-most so they appear above any fallback tiles
                tileNode.z = 1.0;

                // if tileNode is not opaque and displaying data then we've got a gap to fill
                if (!this.tileNodeIsOpaque(tileNode)) {
                    let gapCenterX = tileData.x + tileData.span * 0.5;

                    // fill with larger tiles (higher lod level)
                    for (let p = 1; p < 50; p++) {
                        let densityMultiplier = 1 << p;
                        let fallbackData = TileEngine.getTile(this.model.sourceId, gapCenterX, samplingDensity * densityMultiplier, false);

                        // let newLodX = Math.floor(tileData.lodX / (1 << p))
                        // let fallbackData = TileEngine.getTileFromLodX(this.model.sourceId, tileData.lodLevel + p, newLodX, false);

                        // exhausted all available lods
                        if (fallbackData == null) break;
                        
                        if (fallbackData.state !== TileState.Empty) {
                        // if (fallbackData.state === TileState.Complete) {
                            // this._tileNodeCache.remove(this.getTileKey(fallbackData), this.deleteTileNode);

                            let fallbackNode = this._tileNodeCache.get(this.getTileKey(fallbackData), this.createTileNode);
                            this.updateTileNode(fallbackNode, fallbackData, x0, span, displayLodLevel);

                            // @! improve this
                            // z-position tile so that better lods are front-most
                            fallbackNode.z = (1.0 - fallbackData.lodLevel / 50) - 0.1;

                            // if the fallback node is opaque then we've successfully plugged the gap
                            if (this.tileNodeIsOpaque(fallbackNode)) {
                                break;
                            }
                        }
                    }
                }
            });
        }

        this._tileNodeCache.removeUnused(this.deleteTileNode);
    }
    
    protected createTileNode = (): TileNode => {
        // create empty tile node
        let tileNode = new TileNode();
        tileNode.mask = this;
        this.add(tileNode);
        return tileNode;
    }

    protected deleteTileNode = (tileNode: TileNode) => {
        tileNode.setTile(null); // ensure cleanup is performed
        tileNode.releaseGPUResources();
        this.remove(tileNode);
    }

    protected updateTileNode(tileNode: TileNode, tileData: TileEntry, x0: number, span: number, displayLodLevel: number) {
        tileNode.layoutParentX = (tileData.x - x0) / span;
        tileNode.layoutW = tileData.span / span;
        tileNode.layoutH = 1;
        tileNode.displayLodLevel = displayLodLevel;
        tileNode.setTile(tileData);
    }

    protected getTileKey(tileData: TileEntry) {
        return tileData.lodLevel + '_' + tileData.lodX;
    }

    protected tileNodeIsOpaque(tileNode: TileNode) {
        return (tileNode.render === true) &&
            (tileNode.opacity >= 1) &&
            (tileNode.getTile().state === TileState.Complete);
    }

}

import Object2D, { Object2DInternal } from "../core/Object2D";
import SharedResources from "../core/SharedResources";
import Device, { GPUTexture } from "../../rendering/Device";
import { DrawContext, DrawMode, BlendMode } from "../../rendering/Renderer";
import App from "../../App";
import { Animator } from "../../animation/Animator";
import { DEFAULT_SPRING } from "../UIConstants";
import { UsageCache } from "../../ds/UsageCache";
import { Rect } from "../core/Rect";
import { Text } from "../core/Text";
import Renderable, { RenderableInternal } from "../../rendering/Renderable";

/**
 * - A TileNode render field should only be set to true if it's TileEntry is in the Complete state
 */
const NUCLEOBASE_A_COLOR = new Float32Array([0.216, 0.063, 0.318, 1.0]); // #371051;
const NUCLEOBASE_T_COLOR = new Float32Array([0.200, 0.200, 0.404, 1.0]); // #333367;
const NUCLEOBASE_C_COLOR = new Float32Array([0.043, 0.561, 0.608, 1.0]); // #0B8F9B;
const NUCLEOBASE_G_COLOR = new Float32Array([0.071, 0.725, 0.541, 1.0]); // #12B98A;

const OpenSansRegular = require('../../font/OpenSans-Regular.msdf.bin');

class TileNode extends Object2D {

    set opacity(opacity: number) {
        this._opacity = opacity;
        // switch to opaque rendering as soon as opacity hits 1
        this.transparent = opacity < 1;
        this.blendMode = opacity < 1 ? BlendMode.PREMULTIPLIED_ALPHA : BlendMode.NONE;
    }

    get opacity() {
        return this._opacity;
    }

    displayLodLevel: number;

    protected _opacity: number;
    protected tile: TileEntry;
    protected gpuTexture: GPUTexture;

    protected memoryBlockY: number;

    constructor() {
        super();
        this.opacity = 1;
        this.render = false;
    }

    setTile(tile: TileEntry) {
        // early exit case
        if (tile === this.tile) return;

        if (this.tile != null) {
            this.tile.removeCompleteListener(this.tileComplete);
        }

        this.tile = tile;

        if (tile != null) {
            if (tile.state === TileState.Complete) {
                this.opacity = 1;
                this.tileComplete();
            } else {
                tile.addCompleteListener(this.tileComplete);
                this.opacity = 0;
                this.render = false;
            }

            this.memoryBlockY = (tile.rowIndex  + 0.5) / TileEngine.textureHeight; // y-center of texel
        } else {
            this.render = false;
        }
    }

    getTile() {
        return this.tile;
    }

    private _lastComputedWidth: number;
    private _lastComputedX: number;
    applyTreeTransforms(root?: boolean) {
        // updateLabels depends on computedWidth and layoutX, if any of those has changed we need to call it
        if (
            this.computedWidth !== this._lastComputedWidth ||
            this._lastComputedX !== this.computedX
        ) {
            this._lastComputedWidth = this.computedWidth;
            this._lastComputedX = this.computedX;
            // update labels when laying out scene-graph
            this.updateLabels();
        }

        super.applyTreeTransforms(root);
    }

    allocateGPUResources(device: Device) {
        // static initializations
        this.gpuVertexState = SharedResources.quad1x1VertexState;
        this.gpuProgram = SharedResources.getProgram(
            device,
            TileNode.vertexShader,
            TileNode.fragmentShader,
            ['position']
        );

        // we assume .tile is set and in the complete state before allocateGPUResources is called
        this.gpuTexture = this.tile.getTexture(device);
    }

    releaseGPUResources() {
        // since our resources are shared we don't actually want to release anything here
        this.gpuVertexState = null;
        this.gpuProgram = null;
        this.gpuTexture = null;
    }

    draw(context: DrawContext) {
        context.uniform2f('size', this.computedWidth, this.computedHeight);
        context.uniformMatrix4fv('model', false, this.worldTransformMat4);
        context.uniform1f('opacity', this.opacity);
        context.uniform1f('memoryBlockY', this.memoryBlockY);
        context.uniform3f('offsetScaleLod', this.tile.sequenceMinMax.min, (this.tile.sequenceMinMax.max - this.tile.sequenceMinMax.min), this.displayLodLevel);
        context.uniformTexture2D('memoryBlock', this.gpuTexture);
        context.draw(DrawMode.TRIANGLES, 6, 0);

        if (this.tile != null) {
            this.tile.markLastUsed();
        }
    }

    private _labelCache = new UsageCache<{container: Object2D, text: TextClone}>();
    protected updateLabels() {
        let tile = this.tile;
        this._labelCache.markAllUnused();

        if (tile != null) {
            if (tile.lodLevel === 0 && tile.state === TileState.Complete) {
                let data = tile.data as Uint8Array;

                let baseWidth = 1 / tile.lodSpan;            
                let baseDisplayWidth = this.computedWidth * baseWidth;

                const maxTextSize = 16;
                const minTextSize = 5;
                const padding = 3;
                const maxOpacity = 0.7;
                
                let textSizePx = Math.min(baseDisplayWidth - padding, maxTextSize);
                let textOpacity = Math.min(Math.max((textSizePx - minTextSize) / (maxTextSize - minTextSize), 0.0), 1.0) * maxOpacity;
                textOpacity = textOpacity * textOpacity;

                if (textOpacity > 0 && textSizePx > 0) {

                    // determine the portion of this tile that's visible, only touch labels for this portion
                    // we assume:
                    //     - layoutX and layoutW are used for positioning
                    //     - x >= 0 and x <= 1 is visible range
                    let visibleX0 = -this.layoutParentX / this.layoutW;
                    let visibleX1 = (1 - this.layoutParentX) / this.layoutW;
                    let firstVisibleBase = Scalar.clamp(Math.floor(visibleX0 / baseWidth), 0, tile.lodSpan - 1);
                    let lastVisibleBase = Scalar.clamp(Math.floor(visibleX1 / baseWidth), 0, tile.lodSpan - 1);
                    
                    for (let i = firstVisibleBase; i <= lastVisibleBase; i++) {
                        let a = data[i * 4 + 0] / 0xFF;
                        let c = data[i * 4 + 1] / 0xFF;
                        let g = data[i * 4 + 2] / 0xFF;
                        let t = data[i * 4 + 3] / 0xFF;
                        
                        // @! need proper handling for intermediate values
                        let baseIndex = Math.round(a * 0 + c * 1 + g * 2 + t * 3);
                        let baseCharacter = TileNode.baseCharacters[baseIndex];
                        if (baseCharacter == null) {
                            console.warn('Bad base index', baseIndex, i, ':', a, c, t, g);
                        }

                        let label = this._labelCache.get(i + '', () => this.createLabel(baseCharacter));
                        label.container.layoutParentX = (i + 0.5) * baseWidth;
                        label.container.layoutParentY = 0.5;

                        label.container.sx = label.container.sy = textSizePx;

                        label.text.mask = this.mask;
                        label.text.color[3] = textOpacity;
                    }
                }
                
            }
        }

        this._labelCache.removeUnused(this.deleteLabel);
    }

    protected createLabel = (baseCharacter: string) => {
        let textInstance = TileNode.baseTextInstances[baseCharacter];
        let textClone = new TextClone(TileNode.baseTextInstances[baseCharacter], [1, 1, 1, 1]);
        textClone.additiveBlendFactor = 1.0;

        textClone.layoutX = -0.5;
        textClone.layoutY = -0.5;

        let container = new Object2D();
        container.add(textClone);

        this.add(container);
        return {container: container, text: textClone};
    }

    protected deleteLabel = (label: { container: Object2D, text: TextClone }) => {
        label.text.releaseGPUResources();
        this.remove(label.container);
    }

    protected tileComplete = () => {
        Animator.springTo(this, {'opacity': 1}, DEFAULT_SPRING);
        this.render = true;
        this.gpuResourcesNeedAllocate = true;
        this.updateLabels();
    }

    protected static vertexShader = `
        #version 100

        attribute vec2 position;
        uniform mat4 model;
        uniform vec2 size;
        uniform float memoryBlockY;

        varying vec2 texCoord;
        varying vec2 vUv;

        void main() {
            texCoord = vec2(position.x, memoryBlockY);
            vUv = position;
            gl_Position = model * vec4(position * size, 0., 1.0);
        }
    `;

    protected static fragmentShader = `
        #version 100

        #define PI 3.14159

        precision mediump float;
        uniform float opacity;
        uniform sampler2D memoryBlock;
        uniform vec3 offsetScaleLod;

        varying vec2 texCoord;
        varying vec2 vUv;

        float contrastCurve(float x, float s) {
            float s2 = pow(2.0, s);
            float px = pow(4.0, -s * x);
            return ((s2 + 1.)/(s2*px + 1.0) - 1.) / (s2 - 1.0);
        }

        vec3 viridis( float x ) {
            x = clamp(x, 0., 1.0);
            vec4 x1 = vec4( 1.0, x, x * x, x * x * x ); // 1 x x2 x3
            vec4 x2 = x1 * x1.w * x; // x4 x5 x6 x7
            return vec3(
                dot( x1, vec4( +0.280268003, -0.143510503, +2.225793877, -14.81508888 ) ) + dot( x2.xy, vec2( +25.212752309, -11.77258958 ) ),
                dot( x1, vec4( -0.002117546, +1.617109353, -1.909305070, +2.701152864 ) ) + dot( x2.xy, vec2(  -1.685288385, +0.178738871 ) ),
                dot( x1, vec4( +0.300805501, +2.614650302, -12.01913909, +28.93355911 ) ) + dot( x2.xy, vec2( -33.491294770, +13.76205384 ) )
            );
        }
        
        void main() {
            vec4 texRaw = texture2D(memoryBlock, texCoord);
            // unpack data
            vec4 acgt = texRaw * offsetScaleLod.y + offsetScaleLod.x;

            // micro-scale color
            const vec3 aRgb = vec4(${NUCLEOBASE_A_COLOR.join(', ')}).rgb;
            const vec3 tRgb = vec4(${NUCLEOBASE_T_COLOR.join(', ')}).rgb;
            const vec3 cRgb = vec4(${NUCLEOBASE_C_COLOR.join(', ')}).rgb;
            const vec3 gRgb = vec4(${NUCLEOBASE_G_COLOR.join(', ')}).rgb;

            vec3 colMicro = (
                    acgt[0] * aRgb +
                    acgt[1] * cRgb +
                    acgt[2] * gRgb +
                    acgt[3] * tRgb
            );

            // blend into to macro-scale color
            // macro-scale simulates g-banding with a non-linear response
            float tileLodLevel = offsetScaleLod.z;
            float q = tileLodLevel - 5.0;
            float expectedSpan = min(pow(0.9, q), 1.0);
            float expectedAvg = min(pow(0.8, q) * 0.25 + 0.25, 0.5);
            vec4 acgtScaled = (acgt - expectedAvg) / expectedSpan + 0.5;

            float gc = (acgtScaled[1] + acgtScaled[2]) * 0.5;

            float gcCurved = (contrastCurve(gc, 4.) + 0.3 * gc * gc);
            vec3 colMacro = (
                viridis(gcCurved) +
                vec3(30.) * pow(gc, 12.0) // tend to white at highest-density
            );

            const float microScaleEndLod = 6.0;
            float displayLodLevel = offsetScaleLod.z;
            float microMacroMix = clamp((displayLodLevel - microScaleEndLod) / microScaleEndLod, 0., 1.0);

            gl_FragColor = vec4(mix(colMicro, colMacro, microMacroMix), 1.0) * opacity;

            /**
            // for debug: makes tiling visible
            float debugMask = step(0.45, vUv.y) * step(vUv.y, 0.55);
            vec4 debugColor = vec4(vUv.xxx, 1.0);
            gl_FragColor = mix(gl_FragColor, debugColor, debugMask);
            /**/
        }
    `;

    // we only need 1 text instance of each letter which we can render multiple times
    // this saves reallocating new vertex buffers for each letter
    protected static baseCharacters = ['A', 'C', 'G', 'T'];
    protected static baseTextInstances : { [key: string]: Text } = {
        'A': new Text(OpenSansRegular, 'A', 1),
        'C': new Text(OpenSansRegular, 'C', 1),
        'G': new Text(OpenSansRegular, 'G', 1),
        'T': new Text(OpenSansRegular, 'T', 1),
    }
}

class TextClone extends Object2D {

    color = new Float32Array(4);
    additiveBlendFactor: number = 0.0;
    
    set _w(v: number) {}
    set _h(v: number) {}

    get _w() { return this.text.w; }
    get _h() { return this.text.h; }

    set render(v: boolean) { }
    get render() { return this.text.render; }
    
    constructor(readonly text: Text, color: ArrayLike<number> = [0, 0, 0, 1]) {
        super();
        this.color.set(color);
        this.transparent = true;
        this.blendMode = text.blendMode;
    }

    allocateGPUResources(device: Device) {
        let textInternal = (this.text as any as Object2DInternal);

        if (textInternal.gpuResourcesNeedAllocate) {
            textInternal.allocateGPUResources(device);
            textInternal.gpuResourcesNeedAllocate = false;
        }

        this.gpuProgram = textInternal.gpuProgram;
        this.gpuVertexState = textInternal.gpuVertexState;
    }

    releaseGPUResources() {}

    draw(context: DrawContext) {
        let textInternal = (this.text as any as Object2DInternal);

        // override with local transform and color
        textInternal.worldTransformMat4 = this.worldTransformMat4;
        this.text.color = this.color;
        this.text.additiveBlendFactor = this.additiveBlendFactor;

        this.text.draw(context);
    }

    private _lastW: number;
    private _lastH: number;
    applyTreeTransforms(root?: boolean) {
        
        // if the cloned text dimensions change then we need to update our world transform
        // ! world transform was just calculared
        if ((this._lastW !== this._w) || (this._lastH !== this._h)) {
            this.worldTransformNeedsUpdate = true;
            this._lastW = this._w;
            this._lastH = this._h;
        }

        super.applyTreeTransforms(root);
    }

}

export default SequenceTrack;