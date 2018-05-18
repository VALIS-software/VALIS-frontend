import Device, { GPUTexture } from "../../rendering/Device";
import Scalar from "../../math/Scalar";
import { EventEmitter } from "events";
import SiriusApi from "../../../lib/sirius/SiriusApi";

const TILE_WIDTH: number = 512;
const TILES_PER_BLOCK: number = 4;
const BLOCK_SIZE = TILE_WIDTH * TILES_PER_BLOCK;

export class TileEngine {
    
    protected static setData: {
        [setId: string]: {
            lod: Array<{
                [blockId: string]: Block
            }>
        }
    } = {};

    // private static _emptyTiles = new Array<TileEntry>();
    static prepareTiles(
        setId: string,
        x0: number,
        x1: number,
        samplingDensity: number,
        callback: (tileData: TileEntry) => void
    ) {
        // clamp to positive numbers
        x0 = Math.max(x0, 0);
        x1 = Math.max(x1, 0);

        // guard illegal span
        if (x1 <= x0) return;

        let lodLevelFractional = Scalar.log2(Math.max(samplingDensity, 1));
        let lodLevel = Math.floor(lodLevelFractional);
        let lodDensity = 1 << lodLevel;

        let lodX0 = Math.floor(x0 / lodDensity);
        let lodX1 = Math.ceil(x1 / lodDensity);

        let blocks = TileEngine.getBlocks(setId, lodLevel);

        let block0 = TileEngine.blockIndex(lodX0);
        let tileRow0 = TileEngine.tileRowIndex(lodX0);

        let block1 = TileEngine.blockIndex(lodX1);
        let tileRow1 = TileEngine.tileRowIndex(lodX1);

        for (let blockIndex = block0; blockIndex <= block1; blockIndex++) {

            let blockId = TileEngine.blockId(blockIndex);
            let block = blocks[blockId];

            if (block === undefined) {
                block = TileEngine.createBlock(lodLevel, blockIndex);
                blocks[blockId] = block;
            }
            
            let firstRowIndex = blockIndex === block0 ? tileRow0 : 0;
            let lastRowIndex = blockIndex === block1 ? tileRow1 : (TILES_PER_BLOCK - 1);

            for (let rowIndex = firstRowIndex; rowIndex <= lastRowIndex; rowIndex++) {
                let tile = block.rows[rowIndex];

                if (tile.state === TileState.Empty) {
                    // no data requests have been made yet for this tile
                    TileEngine.requestTileData(tile);
                }

                callback(tile);
            }
        }
    }

    static getTexture(device: Device, __otherParams: any): GPUTexture {
        throw `todo`;
        return null;
    }

    static releaseTextures() {
        throw `todo`;   
    }

    /*
    protected static requestData(tiles: Array<TileEntry>) {
        let batchLodLevel = -1;
        let batchLodX = -1;
        let batchLodSpan = -1;
        let currentBatchTiles: Array<TileEntry>;

        for (let tile of tiles) {
            
            if (
                tile.lodLevel === batchLodLevel &&
                tile.lodX === (batchLodX + batchLodSpan + 1)
            ) {
                // add tile to current batch
                batchLodSpan += tile.lodSpan;
                currentBatchTiles.push(tile);
            } else {
                if (batchLodSpan > 0) {
                }

                // start new batch
                batchLodLevel = tile.lodLevel;
                batchLodX = tile.lodX;
                batchLodSpan = tile.lodSpan;
                currentBatchTiles = [];
            }


            /*

            p.then((a) => {
                let tileInternal = tile as any as TileEntryInternal;
                tile.data = a.array;
                tile.sequenceMinMax = a.sequenceMinMax;
                tile.state = TileState.Complete;
                tileInternal.emitComplete();
            });

            tile.state = TileState.Pending;
        }
    }
    */

    protected static requestTileData(tile: TileEntry) {
        console.log('requsting', tile.lodLevel, tile.lodX, tile.lodSpan);
        let p = SiriusApi.loadACGTSubSequence(tile.lodLevel, tile.lodX, tile.lodSpan);

        tile.state = TileState.Loading;

        p.then((a) => {
            let tileInternal = tile as any as TileEntryInternal;
            tile.data = a.array;
            tile.sequenceMinMax = a.sequenceMinMax;
            tile.state = TileState.Complete;
            tileInternal.emitComplete();
            console.log('\tcomplete', tile.lodLevel, tile.lodX, tile.lodSpan);
        });
    }

    protected static requestContiguousTileData(tiles: Array<TileEntry>) {
        throw `not yet tested`;

        let lodLevel = tiles[0].lodLevel;
        let lodX = tiles[0].lodX;
        let lodSpan = tiles[0].lodSpan * tiles.length;

        // begin request
        let p = SiriusApi.loadACGTSubSequence(lodLevel, lodX, lodSpan);

        // mark tiles as loading
        for (let t of tiles) {
            t.state = TileState.Loading;
        }

        p.then((a) => {
            for (let i = 0; i < tiles.length; i++) {
                let tile = tiles[i];
                let tileInternal = tile as any as TileEntryInternal;

                let sizeOfIndex_bytes = 1;
                let bufferOffset = sizeOfIndex_bytes * a.indicesPerBase * i * tile.lodSpan;
                let bufferLength = sizeOfIndex_bytes * a.indicesPerBase * tile.lodSpan;
                tile.data = new Uint8Array(a.array.buffer, bufferOffset, bufferLength);
                tile.sequenceMinMax = a.sequenceMinMax;
                tile.state = TileState.Complete;
                tileInternal.emitComplete();
            }
        });
    }

    protected static createBlock(lodLevel: number, blockIndex: number): Block {
        let block = {
            lastUsedTimestamp: -1, // never used
            lodLevel: lodLevel,
            rows: new Array(TILES_PER_BLOCK)
        }

        let blockLodX = blockIndex * BLOCK_SIZE;

        // initialize empty tile data objects for each row
        for (let i = 0; i < TILES_PER_BLOCK; i++) {
            // tile (lodLevel, blockIndex, rowIndex)
            let tileLodX = i * TILE_WIDTH + blockLodX;
            block.rows[i] = new TileEntry(block, lodLevel, tileLodX, TILE_WIDTH);
        }

        return block;
    }

    protected static getBlocks(setId: string, lod: number) {
        let set = TileEngine.getSet(setId);
        let blocks = set.lod[lod];
        if (blocks === undefined) {
            blocks = set.lod[lod] = {};
        }
        return blocks;
    }

    protected static getSet(setId: string) {
        let set = TileEngine.setData[setId];
        if (set === undefined) {
            set = TileEngine.setData[setId] = {
                lod: []
            }
        }
        return set;
    }

    protected static tileRowIndex(x: number): number {
        return Math.floor((x % BLOCK_SIZE) / TILE_WIDTH);
    }

    protected static blockIndex(x: number): number {
        return Math.floor(x / BLOCK_SIZE);
    }

    protected static blockId(blockIndex: number): string {
        return blockIndex.toFixed(0);
    }

}

type Block = {
    lastUsedTimestamp: number,
    rows: Array<TileEntry>;
}

enum TileState {
    Empty = 0,
    Loading = 1,
    Complete = 2,
}

type TileEntryInternal = {
    emitComplete(): void;
}

class TileEntry {
    
    state: TileState = TileState.Empty;
    data: ArrayBufferView;
    sequenceMinMax: {
        min: number,
        max: number,
    };

    readonly x: number;
    readonly span: number;

     protected eventEmitter = new EventEmitter();

    constructor(protected readonly block: Block, readonly lodLevel: number, readonly lodX: number, readonly lodSpan: number) {
        let lodDensity = 1 << lodLevel;
        this.x = lodX * lodDensity;
        this.span = lodSpan * lodDensity;
    }

    addCompleteListener(callback: () => void) {
        this.eventEmitter.addListener('complete', callback);
    }

    removeCompleteListener(callback: () => void) {
        this.eventEmitter.removeListener('complete', callback);
    }

    hintTileUsed() {
        this.block.lastUsedTimestamp = performance.now();
    }

    protected emitComplete() {
        this.eventEmitter.emit('complete');
    }

}

export default TileEngine;