import { Track } from "../Track";
import { Scalar } from "../../math/Scalar";
import TileEngine from "./TileEngine";
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

            let basePairsPerDisplayPixel = (span / widthPx) * App.canvasPixelRatio;
            let samplingDensity = basePairsPerDisplayPixel;

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
            });
        }

        // remove unused nodes
        for (let i = tileNodeIndex; i < tileNodes.length; i++) {
            let tileNode = tileNodes[i];
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
import Device from "../../rendering/Device";
import { DrawContext, DrawMode } from "../../rendering/Renderer";
import App from "../../App";

class TileNode extends Object2D {

    constructor() {
        super();
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
                // uniform float memoryBlockY;

                varying vec2 vUv;

                void main() {
                    // @! compute vUv;
                    vUv = position;

                    gl_Position = model * vec4(position * size, 0., 1.0);
                }
            `,
            `
                #version 100

                precision mediump float;

                // uniform sampler2D memoryBlock;

                varying vec2 vUv;
                
                void main() {
                    // vec4 data = texture2D(memoryBlock, vUv);

                    gl_FragColor = vec4(vUv, 0., 1.);
                }
            `,
            ['position']
        );
    }

    releaseGPUResources() {
        // since our resources are shared we don't actually want to release anything here
        this.gpuVertexState = null;
        this.gpuProgram = null;
    }

    draw(context: DrawContext) {
        context.uniform2f('size', this.computedWidth, this.computedHeight);
        context.uniformMatrix4fv('model', false, this.worldTransformMat4);
        context.draw(DrawMode.TRIANGLES, 6, 0);
    }

}

export default SequenceTrack;