import Track from "./Track";
import { TrackModel } from "../../model/TrackModel";
import TileStore, { Tile } from "../../model/data-store/TileStore";
import SharedTileStore from "../../model/data-store/SharedTileStores";
import UsageCache from "../../ds/UsageCache";
import GPUDevice, { AttributeType, AttributeLayout, VertexAttributeBuffer } from "../../rendering/GPUDevice";
import InstancingBase from "../core/InstancingBase";
import SharedResources from "../core/SharedResources";
import { DrawMode, BlendMode, DrawContext } from "../../rendering/Renderer";
import { Object2D } from "../core/Object2D";

type TilePayload = Float32Array;

export default class IntervalTrack extends Track<'interval'> {

    protected tileStore: TileStore<TilePayload, void>;
    
    constructor(model: TrackModel<'interval'>) {
        super(model);
    }

    setContig(contig: string) {
        this.tileStore = SharedTileStore.getTileStore(
            this.model.tileStoreType,
            contig,
            this.model.tileStoreConstructor
        )
        super.setContig(contig);
    }

    protected _pendingTiles = new UsageCache<Tile<any>>();
    protected _intervalTileCache = new UsageCache<IntervalInstances>();
    protected _onStage = new UsageCache<Object2D>();
    protected updateDisplay() {
        this._pendingTiles.markAllUnused();
        this._onStage.markAllUnused();

        const x0 = this.x0;
        const x1 = this.x1;
        const span = x1 - x0;
        const widthPx = this.getComputedWidth();

        if (widthPx > 0) {
            let basePairsPerDOMPixel = (span / widthPx);

            this.tileStore.getTiles(x0, x1, basePairsPerDOMPixel, true, (tile) => {
                let tileKey = this.contig + ':' + tile.key;
                let instancesTile = this._intervalTileCache.get(tileKey, () => {
                    let nIntervals = tile.payload.length * 0.5;

                    let instanceData = new Array<IntervalInstance>(nIntervals);

                    for (let i = 0; i < nIntervals; i++) {
                        let intervalStartIndex = tile.payload[i * 2 + 0];
                        let intervalSpan = tile.payload[i * 2 + 1];

                        let fractionX = (intervalStartIndex - tile.x) / tile.span
                        let wFractional = intervalSpan / tile.span;

                        instanceData[i] = {
                            xFractional: fractionX,
                            wFractional: wFractional,
                            y: 0,
                            z: 1,
                            h: 20,
                            color: [1, 0, 0, 1],
                        };
                    }

                    let instancesTile = new IntervalInstances(instanceData);
                    instancesTile.y = 20;
                    instancesTile.mask = this;

                    return instancesTile;
                });

                instancesTile.layoutParentX = (tile.x - x0) / span;
                instancesTile.layoutW = tile.span / span;

                this._onStage.get(tileKey, () => {
                    this.add(instancesTile);
                    return instancesTile;
                });
            });
        }

        this.displayNeedUpdate = false;
        this._pendingTiles.removeUnused(this.removeTileLoadingDependency);
        this._onStage.removeUnused(this.removeTile);
        this.toggleLoadingIndicator(this._pendingTiles.count > 0, true);
    }

    protected removeTile = (tile: IntervalInstances) => {
        this.remove(tile);
    }

}

type IntervalInstance = {
    xFractional: number, y: number, z: number,
    wFractional: number, h: number,
    color: Array<number>,
};

class IntervalInstances extends InstancingBase<IntervalInstance> {

    constructor(instances: Array<IntervalInstance>) {
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
                'instancePosition': (inst: IntervalInstance) => [inst.xFractional, inst.y, inst.z],
                'instanceSize': (inst: IntervalInstance) => [inst.wFractional, inst.h],
                'instanceColor': (inst: IntervalInstance) => inst.color,
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
                float border = inner.x * inner.y;

                vec4 c = color;
                c.rgb += (1.0 - border) * vec3(borderStrength);

                gl_FragColor = vec4(c.rgb, blendFactor) * c.a * groupOpacity;
            }
        `;
    }

}