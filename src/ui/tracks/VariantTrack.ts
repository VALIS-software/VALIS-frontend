import { QueryBuilder } from "sirius/QueryBuilder";
import { Animator } from "../../animation/Animator";
import { App } from "../../App";
import UsageCache from "../../ds/UsageCache";
import Scalar from "../../math/Scalar";
import { SharedTileStore } from "../../model/data-store/SharedTileStores";
import { TileState } from "../../model/data-store/TileStore";
import { VariantTileStore } from "../../model/data-store/VariantTileStore";
import { TrackModel } from "../../model/TrackModel";
import GPUDevice, { AttributeLayout, AttributeType, VertexAttributeBuffer } from "../../rendering/GPUDevice";
import { BlendMode, DrawContext, DrawMode } from "../../rendering/Renderer";
import InstancingBase from "../core/InstancingBase";
import Object2D from "../core/Object2D";
import { Rect } from "../core/Rect";
import SharedResources from "../core/SharedResources";
import { Text } from "../core/Text";
import { OpenSansRegular } from "../font/Fonts";
import Track from "./Track";
import TextClone from "./util/TextClone";

export class VariantTrack extends Track<'variant'> {

    protected readonly macroLodBlendRange = 1;
    protected readonly macroLodThresholdLow = 8;
    protected readonly macroLodThresholdHigh = this.macroLodThresholdLow + this.macroLodBlendRange;

    protected tileStore: VariantTileStore;
    protected pointerOverTrack = false;

    constructor(model: TrackModel<'variant'>) {
        super(model);

        this.addInteractionListener('pointerenter', (e) => {
            this.pointerOverTrack = true;
        });

        this.addInteractionListener('pointerleave', (e) => {
            this.pointerOverTrack = false;
        });
    }

    setContig(contig: string) {
        let sourceKey = contig + JSON.stringify(this.model.query);
        this.tileStore = SharedTileStore.getTileStore(
            'variant',
            sourceKey,
            (c) => new VariantTileStore(this.model, contig)
        )
        super.setContig(contig);
    }

    protected _microTileCache = new UsageCache<MicroInstances>();
    protected _onStageAnnotations = new UsageCache<Object2D>();
    protected _sequenceLabelCache = new UsageCache<{
        root: Object2D, textParent: Object2D, text: TextClone,
    }>();
    protected updateDisplay() {
        this._pendingTiles.markAllUnused();
        this._onStageAnnotations.markAllUnused();
        this._sequenceLabelCache.markAllUnused();

        const x0 = this.x0;
        const x1 = this.x1;
        const span = x1 - x0;
        const widthPx = this.getComputedWidth();
        if (widthPx > 0) {

            let basePairsPerDOMPixel = (span / widthPx);
            let continuousLodLevel = Scalar.log2(Math.max(basePairsPerDOMPixel, 1));

            let macroOpacity: number = Scalar.linstep(this.macroLodThresholdLow, this.macroLodThresholdHigh, continuousLodLevel);
            let microOpacity: number = 1.0 - macroOpacity;

            // when query is provided, show micro-view at all scales
            if (this.model.query) {
                microOpacity = 1;
                macroOpacity = 0;
            }

            // micro-scale details
            if (microOpacity > 0) {
                this.tileStore.getTiles(x0, x1, basePairsPerDOMPixel, true, (tile) => {
                    if (tile.state !== TileState.Complete) {
                        this._pendingTiles.get(tile.key, () => this.createTileLoadingDependency(tile));
                        return;
                    }

                    const altHeightPx = 25;
                    const tileY = 15;

                    const baseLayoutW = 1 / span;
                    const baseDisplayWidth = widthPx * baseLayoutW;

                    const maxTextSize = 16;
                    const minTextSize = 1;
                    const padding = 1;
                    const maxOpacity = 1.0;
                    const textSizePx = Math.min(baseDisplayWidth - padding, maxTextSize);
                    let textOpacity = Math.min(Math.max((textSizePx - minTextSize) / (maxTextSize - minTextSize), 0.0), 1.0) * maxOpacity;
                    textOpacity = textOpacity * textOpacity;

                    // @! very suboptimal: draw each character individually; should be using a batch text object
                    // display text
                    if (textOpacity > 0 && textSizePx > 0) {
                        for (let variant of tile.payload) {
                            let startIndex = variant.baseIndex;

                            let altIndex = 0;
                            let refSpan = variant.refSequence.length;

                            let color: Array<number> = [1, 0, 0, 1.0]; // default to deletion

                            for (let altSequence in variant.alts) {
                                let altSpan = altSequence.length;

                                let altFreq = variant.alts[altSequence];
                                let lengthDelta = altSpan - refSpan;

                                // generate color from altFreq and lengthDelta
                                let opacity = 1;
                                if (lengthDelta === 0) {
                                    color = [1.0, 1.0, 1.0, opacity];
                                } else if (lengthDelta < 0) {
                                    color = [1.0, 0.3, 0.5, opacity];
                                } else {
                                    color = [0.3, 1.0, 0.5, opacity];
                                }

                                for (let i = 0; i < altSpan; i++) {
                                    let baseCharacter = altSequence[i];
                                    let layoutParentX = ((startIndex + i) - x0) / span;

                                    // skip text outside visible range
                                    if ((layoutParentX + baseLayoutW) < 0 || layoutParentX > 1) {
                                        continue;
                                    }

                                    // create and update text
                                    let cacheKey = this.contig + ':' +  startIndex + ',' + altIndex + ',' + i;
                                    let label = this._sequenceLabelCache.get(cacheKey, () => {
                                        return this.createBaseLabel(baseCharacter, color, () => {
                                            let queryBuilder = new QueryBuilder();
                                            queryBuilder.newGenomeQuery();
                                            queryBuilder.filterID(variant.id);
                                            App.search(queryBuilder.build());
                                        });
                                    });

                                    label.root.layoutParentX = layoutParentX;
                                    label.root.layoutW = baseLayoutW;
                                    label.root.y = altIndex * altHeightPx + tileY;
                                    label.root.h = altHeightPx;

                                    label.textParent.sx = label.textParent.sy = textSizePx;

                                    label.text.color[3] = textOpacity;
                                }

                                altIndex++;
                            }
                        }
                    }

                    let tileObject = this._microTileCache.get(this.contig + ':' + tile.key, () => {
                        let instanceData = new Array<MicroInstance>();

                        // GC -> G = deletion of G
                        // C -> A,TT = replace A, insert TT
                        // ATCCTG -> A { A: 0.005591 }
                        // GCCGCCC -> GCCGCCCCCGCCC, G, GCCGCCCCCGCCCCCGCCC {GCCGCCCCCGCCC: 0.031, G: 0.00009917, GCCGCCCCCGCCCCCGCCC: 0.00006611}

                        for (let variant of tile.payload) {
                            let fractionX = (variant.baseIndex - tile.x) / tile.span;

                            // multiple boxes
                            let refSpan = variant.refSequence.length;

                            let color: Array<number> = [1, 0, 0, 1.0]; // default to deletion

                            let altIndex = 0;
                            for (let altSequence in variant.alts) {
                                let altSpan = altSequence.length;

                                let altFreq = variant.alts[altSequence];
                                let lengthDelta = altSpan - refSpan;

                                // generate color from altFreq and lengthDelta
                                let opacity = altFreq <= 0 ? 0 : Math.sqrt(altFreq);
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

                            // draw line to show reference span
                            instanceData.push({
                                xFractional: fractionX,
                                y: -5,
                                z: 0,
                                wFractional: refSpan / tile.span,
                                h: 2,
                                color: color.slice(0, 3).concat([1]),
                            });
                        }

                        let instancesTile = new MicroInstances(instanceData);
                        instancesTile.y = tileY;
                        instancesTile.z = 0.75;
                        instancesTile.mask = this;

                        return instancesTile;
                    });

                    tileObject.layoutParentX = (tile.x - x0) / span;
                    tileObject.layoutW = tile.span / span;
                    tileObject.opacity = microOpacity;

                    this._onStageAnnotations.get('micro-tile:' + this.contig + ':' + tile.key, () => {
                        this.add(tileObject);
                        return tileObject;
                    });
                });
            }

        }

        this._pendingTiles.removeUnused(this.removeTileLoadingDependency);
        this._onStageAnnotations.removeUnused((t) => this.remove(t));
        this._sequenceLabelCache.removeUnused(this.deleteBaseLabel);
        this.toggleLoadingIndicator(this._pendingTiles.count > 0, true);
        this.displayNeedUpdate = false;
    }

    protected createBaseLabel = (baseCharacter: string, color: ArrayLike<number>, onClick: () => void) => {
        let root = new Rect(0, 0, color);
        root.blendFactor = 0;
        root.mask = this;
        root.opacity = 0;
        root.z = 0.5;

        // highlight on mouse-over
        const springStrength = 250;
        root.addInteractionListener('pointermove', (e) => {
            if (this.pointerOverTrack) {
                root.cursorStyle = 'pointer';
                Animator.springTo(root, {opacity: 0.6}, springStrength);
            } else {
                root.cursorStyle = null;
                Animator.springTo(root, { opacity: 0 }, springStrength);
            }
        });
        root.addInteractionListener('pointerleave', () => {
            root.cursorStyle = null;
            Animator.springTo(root, { opacity: 0 }, springStrength);
        });

        // callback on click
        root.addInteractionListener('pointerup', (e) => {
            if (this.pointerOverTrack && e.isPrimary) {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }
        });

        // add a 0-sized element centered in the root
        // this is used to position the text
        let textParent = new Object2D();
        textParent.z = 0;
        textParent.layoutParentX = 0.5;
        textParent.layoutParentY = 0.5;

        // create textClone
        let textInstance = VariantTrack.baseTextInstances[baseCharacter];
        if (textInstance === undefined) {
            textInstance = VariantTrack.baseTextInstances['?'];
        }

        let textClone = new TextClone(textInstance, [1, 1, 1, 1]);
        textClone.additiveBlendFactor = 1.0;
        textClone.layoutX = -0.5;
        textClone.layoutY = -0.5;
        textClone.mask = this;

        this.add(root);
        root.add(textParent);
        textParent.add(textClone);

        return { root: root, textParent: textParent, text: textClone };
    }

    protected deleteBaseLabel = (label: { root: Object2D, textParent: Object2D, text: TextClone }) => {
        label.textParent.remove(label.text); // ensure textClone cleanup is fired
        label.text.releaseGPUResources();
        this.remove(label.root);
    }

    // we only need 1 text instance of each letter which we can render multiple times
    // this saves reallocating new vertex buffers for each letter
    // this is a stop-gap solution before something like batching or instancing
    protected static baseTextInstances: { [key: string]: Text } = {
        'A': new Text(OpenSansRegular, 'A', 1, [1, 1, 1, 1]),
        'C': new Text(OpenSansRegular, 'C', 1, [1, 1, 1, 1]),
        'G': new Text(OpenSansRegular, 'G', 1, [1, 1, 1, 1]),
        'T': new Text(OpenSansRegular, 'T', 1, [1, 1, 1, 1]),
        '?': new Text(OpenSansRegular, '?', 1, [1, 1, 1, 1]),
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

                // apply a minimum size
                size.x = max(size.x, 1.0);

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
                const float blendFactor = 1.0; // full additive blending

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