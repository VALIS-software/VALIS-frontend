import { SharedTileStore } from "../../model/data-store/SharedTileStores";
import { VariantTileStore } from "../../model/data-store/VariantTileStore";
import { TrackModel } from "../../model/TrackModel";
import Track from "./Track";
import Scalar from "../../math/Scalar";
import { TileState } from "../../model/data-store/TileStore";
import UsageCache from "../../ds/UsageCache";
import InstancingBase from "../core/InstancingBase";
import GPUDevice, { AttributeLayout, VertexAttributeBuffer, AttributeType } from "../../rendering/GPUDevice";
import SharedResources from "../core/SharedResources";
import { BlendMode, DrawMode, DrawContext } from "../../rendering/Renderer";
import Object2D from "../core/Object2D";
import { Text } from "../core/Text";
import { OpenSansRegular } from "../font/Fonts";

export class VariantTrack extends Track<'variant'> {

    protected readonly macroLodBlendRange = 1;
    protected readonly macroLodThresholdLow = 4;
    protected readonly macroLodThresholdHigh = this.macroLodThresholdLow + this.macroLodBlendRange;

    protected tileStore: VariantTileStore;

    constructor(model: TrackModel<'variant'>) {
        super(model);

        this.tileStore = SharedTileStore.variant[model.sequenceId];
    }

    protected _microTileCache = new UsageCache<MicroInstances>();
    protected _onStageAnnotations = new UsageCache<Object2D>();
    protected _sequenceTextCache = new UsageCache<Object2D>();
    protected updateDisplay() {
        this._pendingTiles.markAllUnused();
        this._onStageAnnotations.markAllUnused();
        this._sequenceTextCache.markAllUnused();

        const x0 = this.x0;
        const x1 = this.x1;
        const span = x1 - x0;
        const widthPx = this.getComputedWidth();
        if (widthPx > 0) {
            
            let basePairsPerDOMPixel = (span / widthPx);
            let continuousLodLevel = Scalar.log2(Math.max(basePairsPerDOMPixel, 1));

            let macroOpacity: number = Scalar.linstep(this.macroLodThresholdLow, this.macroLodThresholdHigh, continuousLodLevel);
            let microOpacity: number = 1.0 - macroOpacity;

            // micro-scale details
            if (microOpacity > 0) {
                this.tileStore.getTiles(x0, x1, basePairsPerDOMPixel, true, (tile) => {
                    if (tile.state !== TileState.Complete) {
                        this._pendingTiles.get(tile.key, () => this.createTileLoadingDependency(tile));
                        return;
                    }

                    const altHeightPx = 20;
                    const tileY = 10;

                    // @! suboptimal; should be using a batch text object
                    // display text
                    for (let variant of tile.payload) {
                        let refSpan = variant.refSequence.length;
                        let startIndex = variant.baseIndex;

                        let altIndex = 0;

                        for (let altSequence in variant.alts) {
                            let altSpan = altSequence.length;

                            let layoutParentX = (startIndex - x0) / span;
                            let layoutW = (altSpan) / span;

                            // skip text outside visible range
                            if ((layoutParentX + layoutW) < 0 || layoutParentX > 1) {
                                continue;
                            }

                            // ?create and update text
                            let cacheKey = startIndex + altIndex + '';
                            let text = this._sequenceTextCache.get(cacheKey, () => {
                                let altFreq = variant.alts[altSequence];
                                let lengthDelta = altSpan - refSpan;

                                // generate color from altFreq and lengthDelta
                                let opacity = altFreq;
                                let color: Array<number>;
                                if (lengthDelta === 0) {
                                    color = [.6, .6, .6, 1];
                                } else if (lengthDelta < 0) {
                                    color = [.6,  0,  0, 1];
                                } else {
                                    color = [ 0, .6,  0, 1];
                                }

                                let text = new Text(OpenSansRegular, altSequence, 16, color);
                                text.mask = this;
                                this.add(text);
                                return text;
                            });

                            text.y = altIndex * altHeightPx + tileY;
                            text.layoutParentX = layoutParentX;
                            text.layoutW = layoutW;

                            altIndex++;
                        }
                    }

                    let tileObject = this._microTileCache.get(tile.key, () => {
                        let instanceData = new Array<MicroInstance>();

                        // GC -> G = deletion of G
                        // C -> A,TT = replace A, insert TT
                        // ATCCTG -> A { A: 0.005591 }
                        // GCCGCCC -> GCCGCCCCCGCCC, G, GCCGCCCCCGCCCCCGCCC {GCCGCCCCCGCCC: 0.031, G: 0.00009917, GCCGCCCCCGCCCCCGCCC: 0.00006611}
                        
                        for (let variant of tile.payload) {
                            let fractionX = (variant.baseIndex - tile.x) / tile.span;

                            // multiple boxes
                            let refSpan = variant.refSequence.length;

                            let altIndex = 0;
                            for (let altSequence in variant.alts) {
                                let altSpan = altSequence.length;

                                let altFreq = variant.alts[altSequence];
                                let lengthDelta = altSpan - refSpan;

                                // generate color from altFreq and lengthDelta
                                let opacity = altFreq;
                                let color: Array<number>;
                                if (lengthDelta === 0) {
                                    color = [1, 1, 1, opacity];
                                } else if (lengthDelta < 0) {
                                    color = [1, 0, 0, opacity];
                                } else {
                                    color = [0, 1, 0, opacity];
                                }

                                instanceData.push({
                                    xFractional: fractionX,
                                    y: altIndex * altHeightPx,
                                    z: 0,
                                    wFractional: altSpan / tile.span,
                                    h: altHeightPx,
                                    color: color,
                                });

                                altIndex++;
                            }
                        }

                        let instancesTile = new MicroInstances(instanceData);
                        instancesTile.y = tileY;
                        instancesTile.z = 0.75;
                        instancesTile.mask = this;

                        console.log('Created instances tile', instanceData, instancesTile);
                        return instancesTile;
                    });

                    tileObject.layoutParentX = (tile.x - x0) / span;
                    tileObject.layoutW = tile.span / span;
                    tileObject.opacity = 1.0;

                    this._onStageAnnotations.get('micro-tile:' + tile.key, () => {
                        this.add(tileObject);
                        return tileObject;
                    });
                });
            }

        }

        this._pendingTiles.removeUnused(this.deleteTileLoadingDependency);
        this._onStageAnnotations.removeUnused((t) => this.remove(t));
        this._sequenceTextCache.removeUnused((text) => {
            this.remove(text);
            text.releaseGPUResources();
        });
        this.toggleLoadingIndicator(this._pendingTiles.count > 0, true);
        this.displayNeedUpdate = false;
    }

}

type MicroInstance = {
    xFractional: number, y: number, z: number,
    wFractional: number, h: number,
    color: Array<number>,
};

class MicroInstances extends InstancingBase<MicroInstance> {

    constructor(instances: Array<MicroInstance>) {
        super(
            instances,
            [
                { name: 'position', type: AttributeType.VEC2 }
            ],
            [
                { name: 'instancePosition', type: AttributeType.VEC3 },
                { name: 'instanceSize', type: AttributeType.VEC2 },
                { name: 'instanceColor', type: AttributeType.VEC4 },
            ],
            {
                'instancePosition': (inst: MicroInstance) => [inst.xFractional, inst.y, inst.z],
                'instanceSize': (inst: MicroInstance) => [inst.wFractional, inst.h],
                'instanceColor': (inst: MicroInstance) => inst.color,
            }
        );

        this.transparent = true;
        this.blendMode = BlendMode.PREMULTIPLIED_ALPHA;
    }

    draw(context: DrawContext) {
        context.uniform2f('groupSize', this.computedWidth, this.computedHeight);
        context.uniform1f('groupOpacity', this.opacity);
        context.uniformMatrix4fv('groupModel', false, this.worldTransformMat4);
        context.extDrawInstanced(DrawMode.TRIANGLES, 6, 0, this.instanceCount);
    }

    protected allocateGPUVertexState(
        device: GPUDevice,
        attributeLayout: AttributeLayout,
        instanceVertexAttributes: { [name: string]: VertexAttributeBuffer }
    ) {
        return device.createVertexState({
            index: SharedResources.quadIndexBuffer,
            attributeLayout: attributeLayout,
            attributes: {
                // vertices
                'position': {
                    buffer: SharedResources.quad1x1VertexBuffer,
                    offsetBytes: 0,
                    strideBytes: 2 * 4,
                },
                ...instanceVertexAttributes
            }
        });
    }

    protected getVertexCode() {
        return `
            #version 100

            // for all instances
            attribute vec2 position;
            uniform mat4 groupModel;
            uniform vec2 groupSize;
            
            // per instance attributes
            attribute vec3 instancePosition;
            attribute vec2 instanceSize;
            attribute vec4 instanceColor;

            varying vec2 vUv;

            varying vec2 size;
            varying vec4 color;

            void main() {
                vUv = position;
                
                // yz are absolute domPx units, x is in fractions of groupSize
                vec3 pos = vec3(groupSize.x * instancePosition.x, instancePosition.yz);
                size = vec2(groupSize.x * instanceSize.x, instanceSize.y);

                color = instanceColor;

                gl_Position = groupModel * vec4(vec3(position * size, 0.0) + pos, 1.0);
            }
        `;
    }

    protected getFragmentCode() {
        return `
            #version 100

            precision highp float;

            uniform float groupOpacity;

            varying vec2 size;
            varying vec4 color;

            varying vec2 vUv;
            
            void main() {
                const float blendFactor = 0.0; // full additive blending

                vec2 domPx = vUv * size;
            
                const vec2 borderWidthPx = vec2(1.);
                const float borderStrength = 0.3;

                vec2 inner = step(borderWidthPx, domPx) * step(domPx, size - borderWidthPx);
                float border = 1.0 - inner.x * inner.y;

                vec4 c = color;
                c.rgb += border * vec3(borderStrength);
                c.a = mix(c.a, 0.8, border);

                gl_FragColor = vec4(c.rgb, blendFactor) * c.a * groupOpacity;
            }
        `;
    }

}

export default VariantTrack;