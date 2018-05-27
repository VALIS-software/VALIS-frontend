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
    private _tileNodes = new Array<TileNode>();

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

        let tileNodeIndex = 0;
        let tileNodes = this._tileNodes;

        if (widthPx > 0) {

            let basePairsPerDOMPixel = (span / widthPx);

            let samplingDensity = basePairsPerDOMPixel / App.canvasPixelRatio;

            TileEngine.prepareTiles(this.model.sourceId, x0, x1, samplingDensity, (tileData) => {
                let i = tileNodeIndex++;
                let tileNode = tileNodes[i];

                if (tileNode === undefined) {
                    tileNode = new TileNode();
                    tileNode.mask = this;
                    tileNodes[i] = tileNode;
                    this.add(tileNode);
                }

                tileNode.layoutParentX = (tileData.x - x0) / span;
                tileNode.layoutW = tileData.span / span;
                tileNode.layoutH = 1;
                tileNode.z = 0.5;
                tileNode.setTile(tileData);
            });
        }

        // remove unused nodes
        for (let i = tileNodeIndex; i < tileNodes.length; i++) {
            let tileNode = tileNodes[i];
            tileNode.setTile(null); // ensure cleanup is performed
            this.remove(tileNode);
        }

        // trim unused nodes from array
        tileNodes.length = tileNodeIndex;


        /*

        (x0, x1, density)

        // Primary Data
        {
            // get data to cover range
            let tileDataset = TileEngine.getTiles(x0, x1, density) -> Array<{
                id,
                coveringRange: [fx0, fw]
                array, texture // data and texture may be empty initially but load in later
            }>

            // make sure we've got at least 'tileData.length' tileNodes available
            // remove unused nodes
            let tileNodes = ...

            // toolTip values are handled by the tileNode
            tileNode.addInteractionListener('pointermove', (e) => {
                // update tooltop
            });

            for (data in tileDataSet) {
                tileNode.x = data.fx0;
                tileNode.layoutW = data.fw;
                tileNode.setArray(data.array);
                tileNode.setTexture(data.texture);

                // fade in tile node after data arrives
                // make tile node capture pointer events when data is available
            }

        }

        // Fallback Data
        {
            // get the best data we have available in cache to cover the range
            // should be z-indexed _behind_ primary data
            // if no data is available skip the tile
            // if we prefetch a high lod then we will always have something to display
            // when zooming in, as soon as a lod threshold is crossed primary data should be returned as fallback data
            // fallback tiles handled _exactly_ like primary tiles execpt their z-indexed
            // this means they also set the tooltip values

            let fallbackTileDataset = TileEngine.getTilesFromCache(x0, x1, density) -> ...
        }
        */
    }

}

import Object2D from "../core/Object2D";
import SharedResources from "../core/SharedResources";
import Device, { GPUTexture } from "../../rendering/Device";
import { DrawContext, DrawMode, BlendMode } from "../../rendering/Renderer";
import App from "../../App";
import { Animator } from "../../animation/Animator";
import { DEFAULT_SPRING } from "../UIConstants";

/**
 * - A TileNode render field should only be set to true if it's TileEntry is in the Complete state
 */
class TileNode extends Object2D {

    set opacity(v: number) {
        this._opacity = v;
        // switch to opaque rendering as soon as opacity hits 1
        this.transparent = v < 1;
        this.blendMode = v < 1 ? BlendMode.PREMULTIPLIED_ALPHA : BlendMode.NONE;
    }

    get opacity() {
        return this._opacity;
    }

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
            this.tile.removeCompleteListener(this.onTileComplete);
        }

        this.tile = tile;

        if (tile != null) {
            if (tile.state === TileState.Complete) {
                this.opacity = 1;
                this.tileComplete();
            } else {
                tile.addCompleteListener(this.onTileComplete);
                this.opacity = 0;
                this.render = false;
            }

            this.memoryBlockY = (tile.rowIndex  + 0.5) / TileEngine.textureHeight; // y-center of texel
        } else {
            this.render = false;
        }
    }

    allocateGPUResources(device: Device) {
        // static initializations
        this.gpuVertexState = SharedResources.quad1x1VertexState;
        this.gpuProgram = SharedResources.getProgram(
            device,
            `
                #version 100

                attribute vec2 position;
                uniform mat4 model;
                uniform vec2 size;
                uniform float memoryBlockY;

                varying vec3 vUv;

                void main() {
                    vUv = vec3(position.xy, memoryBlockY);
                    gl_Position = model * vec4(position * size, 0., 1.0);
                }
            `,
            `
                #version 100

                #define PI 3.14159

                precision mediump float;
                uniform float opacity;
                uniform sampler2D memoryBlock;
                uniform vec3 offsetScaleLod;

                varying vec3 vUv;

                vec3 contrastCurveOld(vec3 x, vec3 s) {
                    vec3 s2 = pow(vec3(2.0), s);
                    vec3 offset = 1.0 + 1.0/(s2 - 1.0);
                    vec3 scale = s2 + 1.0;
                    return
                        offset +
                        scale /
                        (
                            (1.0 - s2) * (1.0 + pow(vec3(2.0), 2.0 * x - 1.0))
                        );
                }

                vec3 hsv2rgb(vec3 c){
                    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
                    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
                    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
                }

                vec3 rgb2hsv(vec3 c)
                {
                    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
                    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
                    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

                    float d = q.x - min(q.w, q.y);
                    float e = 1.0e-10;
                    return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
                }
                
                void main() {
                    vec4 texRaw = texture2D(memoryBlock, vUv.xz);
                    // unpack data
                    vec4 acgt = texRaw * offsetScaleLod.y + offsetScaleLod.x;

                    // scale data to roughly 0 - 1 range
                    /*
                    float q = offsetScaleLod.z - 5.0;
                    float expectedSpan = min(pow(0.9, q), 1.0);
                    float expectedAvg = min(pow(0.8, q) * 0.25 + 0.25, 0.5);
                    vec4 acgtScaled = (acgt - expectedAvg) / expectedSpan + 0.5;
                    */
                   vec4 acgtScaled = acgt;

                    // micro-scale scheme
                    {
                       vec3 pRed = vec3(255.0, 101.0, 97.0) / 255.0;
    vec3 pOra = vec3(255.0, 170.0, 97.0) / 255.0;
    vec3 pBlu = vec3(63.0, 159.0, 163.0) / 255.0;
	vec3 pGre = vec3(78.0, 206.0, 86.0) / 255.0;
    
     vec3 pRedHsv = rgb2hsv(pRed);
     vec3 pOraHsv = rgb2hsv(pOra);
     vec3 pBluHsv = rgb2hsv(pBlu);
     vec3 pGreHsv = rgb2hsv(pGre);
    
    pRed = hsv2rgb(vec3(pRedHsv.x + -0.288 / 10., pRedHsv.y + -0.072, pRedHsv.z + 0.372));
    pOra = hsv2rgb(vec3(pRedHsv.x + -6.312 / 10., pRedHsv.y + -0.008, pRedHsv.z + 0.436));
    pBlu = hsv2rgb(vec3(pBluHsv.x + 1.696 / 10., pBluHsv.y + -0.184, pBluHsv.z + 0.628));
    pGre = hsv2rgb(vec3(pGreHsv.x + 2.224 / 10., pGreHsv.y + -0.032, pGreHsv.z + 0.324));
    
    vec3 atHsv = vec3(5.184 / 10., 0.606, 0.872);
    vec3 gtHsv = vec3(
        0.974/10., .60596, 0.984);
    
    // split
    const float atDelta = 0.060;
    const float gcDelta = 0.052;
    vec3 aRgb = pOra;
    vec3 tRgb = pGre;
    vec3 cRgb = pBlu;
	vec3 gRgb = pRed;

                        vec3 col =
                            acgtScaled[0] * aRgb +
                            acgtScaled[1] * cRgb +
                            acgtScaled[2] * gRgb +
                            acgtScaled[3] * tRgb;

                        gl_FragColor.rgb = col;
                        gl_FragColor.a = 1.0;
                        return;
                    }

                    // macro-scale scheme
                    vec3 atColor = vec3(0.0/255.0, 200.0/255.0, 255.0/255.0);
                    vec3 gcColor = vec3(255.0/255.0, 44.0/255.0, 222.0 / 255.0);

                    vec3 as = contrastCurveOld(vec3(acgtScaled[0]), vec3(0.5)) * atColor;
                    vec3 gs = contrastCurveOld(vec3(acgtScaled[1]), vec3(0.5)) * gcColor;

                    gl_FragColor = vec4(
                        gs + as,
                        1.0
                    ) * opacity;

                    // At microscale, atColor should break into blue and green and gcColor should break into red and orange

                    /**/
                    float debugMask = step(0.95, vUv.y) * step(vUv.y, 1.0);
                    vec4 debugColor = vec4(vec3(1.0) * vUv.x, 1.0);
                    gl_FragColor = mix(gl_FragColor, debugColor, debugMask);
                    /**/

                    return;


                    const vec3 cA = vec3(178, 81, 107)/255.0;
                    const vec3 cC = vec3(200, 161, 85)/255.0;
                    const vec3 cG = vec3(65, 88, 133)/255.0;
                    const vec3 cT = vec3(117, 177, 75)/255.0;

                    /*
                    gl_FragColor = vec4(
                        cA * acgt[0] +
                        cC * acgt[1] +
                        cG * acgt[2] +
                        cT * acgt[3]
                    , 1.0) * opacity;
                    */
                }
            `,
            ['position']
        );

        // we assume .tile is set and in the complete state before allocateGPUResources is called
        this.gpuTexture = this.tile.getTexture(device);
    }

    releaseGPUResources() {
        // since our resources are shared we don't actually want to release anything here
        this.gpuVertexState = null;
        this.gpuProgram = null;
    }

    draw(context: DrawContext) {
        context.uniform2f('size', this.computedWidth, this.computedHeight);
        context.uniformMatrix4fv('model', false, this.worldTransformMat4);
        context.uniform1f('opacity', this.opacity);
        context.uniform1f('memoryBlockY', this.memoryBlockY);
        context.uniformTexture2D('memoryBlock', this.gpuTexture);
        context.uniform3f('offsetScaleLod', this.tile.sequenceMinMax.min, (this.tile.sequenceMinMax.max - this.tile.sequenceMinMax.min), this.tile.lodLevelFractional);
        context.draw(DrawMode.TRIANGLES, 6, 0);

        if (this.tile != null) {
            this.tile.updateLastUsed();
        }
    }

    protected onTileComplete = () => {
        this.tileComplete();
    }

    protected tileComplete() {
        // Animator.springTo(this, {'opacity': 1}, DEFAULT_SPRING);
        this.opacity = 1;
        this.render = true;
        this.gpuResourcesNeedAllocate = true;
    }

}

export default SequenceTrack;