import Device, { GPUTexture, TextureFormat, TextureDataType, TextureUsageHint, TextureMagFilter, TextureMinFilter, TextureWrapMode, ColorSpaceConversion } from "../../rendering/Device";
import Scalar from "../../math/Scalar";
import { EventEmitter } from "events";
import SiriusApi from "../../../lib/sirius/SiriusApi";

const TILE_WIDTH: number = 1024;
const TILES_PER_BLOCK: number = 8;
const BLOCK_SIZE = TILE_WIDTH * TILES_PER_BLOCK;
const LOD_SKIP = 2; // only use lods 0, 2, 4, ...

type Set = {
    lod: Array<Blocks>
}

type Blocks = { [blockId: string]: Block }

export class TileEngine {

    static readonly textureWidth = TILE_WIDTH;
    static readonly textureHeight = TILES_PER_BLOCK;
    
    protected static tileSets: {
        [setId: string]: Set
    } = {};

    static getTiles(
        setId: string,
        x0: number,
        x1: number,
        samplingDensity: number,
        requestData: boolean,
        callback: (tileData: TileEntry) => void
    ) {
        // clamp to positive numbers
        x0 = Math.max(x0, 0);
        x1 = Math.max(x1, 0);

        // guard illegal span
        if (x1 <= x0) return;

        let lodLevelFractional = Scalar.log2(Math.max(samplingDensity, 1));
        let lodLevel = Math.floor(lodLevelFractional);

        lodLevel = this.filterLodLevel(lodLevel);

        // convert range (at lod 0) to map to the current lod level (and round up/down greedily)
        let lodDensity = 1 << lodLevel;
        let x0_lodSpace = Math.floor(x0 / lodDensity);
        let x1_lodSpace = Math.ceil(x1 / lodDensity);

        // find the block and row within the block that overlaps x0 and x1
        let block0 = this.blockIndex(x0_lodSpace);
        let tileRow0 = this.tileRowIndex(x0_lodSpace);

        let block1 = this.blockIndex(x1_lodSpace);
        let tileRow1 = this.tileRowIndex(x1_lodSpace);

        // iterate over all blocks which intersect the range (creating blocks when they don't exist)
        // request data for each 'tile row' (aka a row of data in a block that corresponds to a single tile)
        // fire callback for each tile instance
        let blocks = this.getBlocks(this.getSet(setId), lodLevel);        
        for (let blockIndex = block0; blockIndex <= block1; blockIndex++) {

            let block = this.getBlock(blocks, lodLevel, blockIndex);
            
            let firstRowIndex = blockIndex === block0 ? tileRow0 : 0;
            let lastRowIndex = blockIndex === block1 ? tileRow1 : (TILES_PER_BLOCK - 1);

            for (let rowIndex = firstRowIndex; rowIndex <= lastRowIndex; rowIndex++) {
                let tile = block.rows[rowIndex];

                if (requestData && tile.state === TileState.Empty) {
                    // no data requests have been made yet for this tile
                    this.requestTileData(tile);
                }

                callback(tile);
            }
        }
    }

    static getTile(
        setId: string,
        x: number,
        samplingDensity: number,
        requestData: boolean
    ): TileEntry {
        x = Math.max(0, x);

        let lodLevelFractional = Scalar.log2(Math.max(samplingDensity, 1));
        let lodLevel = Math.floor(lodLevelFractional);
        let lodDensity = 1 << lodLevel;

        let x_lodSpace = Math.floor(x / lodDensity);

        return this.getTileFromLodX(setId, lodLevel, x_lodSpace, requestData);
    }

    static getTileFromLodX(
        setId: string,
        lodLevel: number,
        lodX: number,
        requestData: boolean
    ): TileEntry {
        lodLevel = this.filterLodLevel(lodLevel);

        let set = this.getSet(setId);
        let maxLodLevel = set.lod.length - 1;

        if (lodLevel > maxLodLevel || lodLevel < 0) {
            return null;
        }

        let blockIndex = this.blockIndex(lodX);
        let rowIndex = this.tileRowIndex(lodX);

        let blocks = this.getBlocks(set, lodLevel);
        let block = this.getBlock(blocks, lodLevel, blockIndex);

        let tile = block.rows[rowIndex];

        if (requestData && tile.state === TileState.Empty) {
            this.requestTileData(tile);
        }

        return tile;
    }

    static getTexture(device: Device, block: Block): GPUTexture {
        if (block.gpuTexture !== undefined) {
            return block.gpuTexture;
        }

        let nChannels = 4;

        // allocate texture
        block.gpuTexture = device.createTexture({
            format: TextureFormat.RGBA,

            // mipmapping should be turned off to avoid rows blending with one another
            // if TILES_PER_BLOCK = 0 then mipmapping may be enabled
            generateMipmaps: false,

            // FireFox emits performance warnings when using texImage2D on uninitialized textures
            // in our case it's faster to let the browser zero the texture rather than allocating another array buffer
            mipmapData: null, //[new Uint8Array(BLOCK_SIZE * nChannels)],
            width: TILE_WIDTH,
            height: TILES_PER_BLOCK,
            dataType: TextureDataType.UNSIGNED_BYTE,

            samplingParameters: {
                magFilter: block.lodLevel > 0 ? TextureMagFilter.LINEAR : TextureMagFilter.NEAREST,
                minFilter: TextureMinFilter.LINEAR,
                wrapS: TextureWrapMode.CLAMP_TO_EDGE,
                wrapT: TextureWrapMode.CLAMP_TO_EDGE,
            },

            pixelStorage: {
                packAlignment: 1,
                unpackAlignment: 1,
                flipY: false,
                premultiplyAlpha: false,
                colorSpaceConversion: ColorSpaceConversion.NONE,
            },
        });

        // upload all complete tiles within the block
        for (let i = 0; i < block.rows.length; i++) {
            let tile = block.rows[i];
            let tileInternal = tile as any as TileEntryInternal;
            if (tileInternal.state === TileState.Complete) {
                this.uploadTileData(tile);
            } else {
                // wait until the tile data is ready before upload
                // this listener must be removed if the gpuTexture object is deleted
                // see: releaseTexture(block: Block)
                tile.addCompleteListener(this.uploadTileData);
            }
        }

        return block.gpuTexture;
    }

    protected static filterLodLevel(lodLevel: number) {
        return Math.floor(lodLevel / LOD_SKIP) * LOD_SKIP;
    }

    protected static uploadTileData = (tile: TileEntry) => {
        let tileInternal = tile as any as TileEntryInternal;
        tileInternal.block.gpuTexture.updateTextureData(
            0,
            TextureFormat.RGBA,
            tile.data,
            0, tile.rowIndex, // x, y
            Math.min(TILE_WIDTH, tile.length), 1, // w, h
        );
    }

    static releaseTextures(setId?: string) {
        if (setId == null) {
            for (let setId in this.tileSets) {
                if (setId == null) continue;
                this.releaseTextures(setId);
            }
        }

        let tileSet = this.tileSets[setId];

        for (let blocks of tileSet.lod) {
            if (blocks == null) continue;
            for (let blockId in blocks) {
                this.releaseTexture(blocks[blockId]);
            }
        }
    }

    static releaseTexture(block: Block) {
        if (block.gpuTexture != null) {
            block.gpuTexture.delete();
            block.gpuTexture = null;

            // remove data upload listeners
            for (let i = 0; i < block.rows.length; i++) {
                let tile = block.rows[i];
                tile.removeCompleteListener(this.uploadTileData);
            }
        }
    }

    static clearTiles(setId: string) {
        this.releaseTextures(setId);
        delete this.tileSets[setId];
    }

    static clearAllTiles() {
        this.releaseTextures(null);
        this.tileSets = {};
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
        const tileInternal = tile as any as TileEntryInternal;

        let p = SiriusApi.loadACGTSubSequence(tile.lodLevel, tile.lodX, tile.lodSpan);

        tileInternal.state = TileState.Loading;

        p.then((a) => {
            tileInternal.data = a.array;
            tileInternal.length = a.array.length / a.indicesPerBase;
            tileInternal.sequenceMinMax = a.sequenceMinMax;
            tileInternal.state = TileState.Complete;
            tileInternal.emitComplete();
        }).catch((reason) => {
            console.warn(`Tile data request failed`, tile);
            tileInternal.state = TileState.Empty;
        });
    }

    /*
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
    */

    protected static createBlock(lodLevel: number, blockIndex: number): Block {
        let block: Block = {
            lastUsedTimestamp: -1, // never used
            lodLevel: lodLevel,
            rows: new Array(TILES_PER_BLOCK),
            gpuTexture: undefined,
        }

        let blockLodX = blockIndex * BLOCK_SIZE;

        // initialize empty tile data objects for each row
        for (let rowIndex = 0; rowIndex < TILES_PER_BLOCK; rowIndex++) {
            // tile (lodLevel, blockIndex, rowIndex)
            // let tileIndex = blockIndex * TILES_PER_BLOCK + rowIndex;
            let tileLodX = rowIndex * TILE_WIDTH + blockLodX;
            block.rows[rowIndex] = new TileEntry(block, rowIndex, lodLevel, tileLodX, TILE_WIDTH);
        }

        return block;
    }

    protected static getBlock(blocks: Blocks, lodLevel: number, blockIndex: number) {
        let blockId = this.blockId(blockIndex);
        let block = blocks[blockId];

        if (block === undefined) {
            block = this.createBlock(lodLevel, blockIndex);
            blocks[blockId] = block;
        }

        return block;
    }

    protected static getBlocks(set: Set, lod: number) {
        let blocks = set.lod[lod];
        if (blocks === undefined) {
            blocks = set.lod[lod] = {};
        }
        return blocks;
    }

    protected static getSet(setId: string) {
        let set = this.tileSets[setId];
        if (set === undefined) {
            set = this.tileSets[setId] = {
                lod: []
            }
        }
        return set;
    }

    protected static tileRowIndex(lodX: number): number {
        return Math.floor((lodX % BLOCK_SIZE) / TILE_WIDTH);
    }

    protected static blockIndex(lodX: number): number {
        return Math.floor(lodX / BLOCK_SIZE);
    }

    protected static blockId(blockIndex: number): string {
        return blockIndex.toFixed(0);
    }

}

export enum TileState {
    Empty = 0,
    Loading = 1,
    Complete = 2,
}

type TileEntryInternal = {
    block: Block;
    state: TileState;
    data: ArrayBufferView;
    length: number;
    sequenceMinMax: {
        min: number,
        max: number,
    };
    emitComplete(): void;
}

export class TileEntry {

    readonly state: TileState = TileState.Empty;
    readonly data: ArrayBufferView;
    readonly length: number = 0;
    readonly sequenceMinMax: {
        min: number,
        max: number,
    };

    readonly x: number;
    readonly span: number;

    protected eventEmitter = new EventEmitter();

    constructor(
        protected readonly block: Block,
        readonly rowIndex: number,
        readonly lodLevel: number,
        readonly lodX: number,
        readonly lodSpan: number
    ) {
        let lodDensity = 1 << lodLevel;
        this.x = lodX * lodDensity;
        this.span = lodSpan * lodDensity;
    }

    getTexture(device: Device) {
        return TileEngine.getTexture(device, this.block);
    }

    addCompleteListener(callback: (tile: TileEntry) => void) {
        this.eventEmitter.addListener('complete', callback);
    }

    removeCompleteListener(callback: (tile: TileEntry) => void) {
        this.eventEmitter.removeListener('complete', callback);
    }

    markLastUsed() {
        this.block.lastUsedTimestamp = performance.now();
    }

    protected emitComplete() {
        this.eventEmitter.emit('complete', this);
    }

}

type Block = {
    lastUsedTimestamp: number,
    lodLevel: number,
    rows: Array<TileEntry>,
    gpuTexture: GPUTexture,
}

export default TileEngine;