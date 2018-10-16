import { TileLoader, IDataSource, Tile } from "genome-browser";
import { GPUDevice, GPUTexture, TextureFormat, TextureDataType, TextureMagFilter, TextureMinFilter, TextureWrapMode, ColorSpaceConversion } from "engine/rendering/GPUDevice";
import { SignalTrackModel } from "./SignalTrackModel";

import { AxiosDataLoader, BigWigReader, HeaderData } from  "bigwig-reader";

export type SignalTilePayload = {
    array: Float32Array,
    sequenceMinMax: {
        min: number,
        max: number,
    };
    dataUploaded: boolean,
    getTexture(device: GPUDevice): GPUTexture;
}

type BlockPayload = {
    _gpuTexture: GPUTexture,
    floatPacking: boolean,
    getTexture(device: GPUDevice): GPUTexture;
}

export class SignalTileLoader extends TileLoader<SignalTilePayload, BlockPayload> {

    ready : boolean = false;

    protected header: HeaderData;

    protected lodMap: Array<number>;
    protected lodZoomIndexMap: Array<number | null>;

    protected bigWigLoader: AxiosDataLoader;
    protected bigWigReader: BigWigReader;

    constructor(
        protected readonly dataSource: IDataSource,
        protected readonly model: SignalTrackModel,
        protected readonly contig: string
    ) {
        super(1024, 8);

        this.bigWigLoader = new AxiosDataLoader(model.path);
        this.bigWigReader = new BigWigReader(this.bigWigLoader);
        this.bigWigReader.getHeader().then((header) => {
            this.header = header;
            console.log('Header loaded', header);

            let lookupTables = this.generateLodLookups(header);
            this.lodMap = lookupTables.lodMap;
            this.lodZoomIndexMap = lookupTables.lodZoomIndexMap;

            this.ready = true;
        });
    }

    protected generateLodLookups(bigWigHeader: HeaderData): {
        lodMap: Array<number>,
        lodZoomIndexMap: Array<number>,
    } {

        let reductionLevelToLod = (reductionLevel: number) => Math.floor(Math.log2(reductionLevel));

        let availableLods = bigWigHeader.zoomLevelHeaders.map((h) => reductionLevelToLod(h.reductionLevel));
        availableLods = availableLods.sort((a, b) => a - b); // so javascript doesn't sort our numbers alphabetically 
        // lod level 0 should always be available
        if (availableLods[0] !== 0) availableLods.unshift(0);

        let highestLod = availableLods[availableLods.length - 1];

        // fill maps
        let lodMap = new Array(highestLod);
        let lodZoomIndexMap = new Array(highestLod);

        console.log(availableLods);

        for (let i = 0; i < highestLod; i++) {

            // find nearest lod either side of i
            for (let j = 0; j < availableLods.length; j++) {
                let l = availableLods[j];
                if (l > i) { // we've found the upper lod
                    let upperLod = l;
                    let lowerLod = availableLods[j - 1];
                    // pick closest lod
                    let bestLod = ((i - lowerLod) <= (upperLod - i)) ? lowerLod : upperLod;
                    lodMap[i] = bestLod;
                    break;
                }
            }

            // find corresponding index for this lod
            let zoomHeaderEntry = bigWigHeader.zoomLevelHeaders.find((h) => reductionLevelToLod(h.reductionLevel) === lodMap[i]);

            if (zoomHeaderEntry == null) {
                lodZoomIndexMap[i] = null;
            } else {
                lodZoomIndexMap[i] = zoomHeaderEntry.index;
            }
        }

        console.log('lodmap', lodMap);
        console.log('lodZoomIndexMap', lodZoomIndexMap);

        return {
            lodMap: lodMap,
            lodZoomIndexMap: lodZoomIndexMap,
        }
    }

    protected mapLodLevel(l: number) {
        let mappedLod = this.lodMap[l];
        if (mappedLod == null) {
            // l is out of range of lookup table, return the top lod
            return this.lodMap[this.lodMap.length - 1];
        } else {
            return mappedLod;
        }
    }

    protected getTilePayload(tile: Tile<SignalTilePayload>): Promise<SignalTilePayload> {
        let zoomIndex = this.lodZoomIndexMap[tile.lodLevel];
        let lodDensity = Math.pow(2, tile.lodLevel);

        // @! use for normalization
        let dataMultiplier = 0.1;

        let dataPromise: Promise<Float32Array>;

        if (zoomIndex !== null) {
            // fetch from zoomed
            console.log('fetch zoomed', zoomIndex);
            dataPromise = this.bigWigReader.readZoomData(
                this.contig,
                tile.x,
                this.contig,
                tile.x + tile.span, // @! needs checking,
                zoomIndex,
            ).then((zoomData) => {
                // fill float array with zoom data regions
                let nChannels = 4;
                let floatArray = new Float32Array(tile.lodSpan * nChannels);

                for (let entry of zoomData) {
                    let x0 = entry.start - tile.x;
                    let x1 = entry.end - tile.x;
                    let i0 = Math.round(x0 / lodDensity);
                    let i1 = Math.round(x1 / lodDensity);

                    // fake norm
                    let value = (entry.sumData / entry.validCount) * dataMultiplier;

                    for (let i = i0; i < i1; i++) {
                        floatArray[i * nChannels] = value;
                    }
                }

                return floatArray;
            });
        } else {
            // fetch 'raw'
            console.log('fetch raw');
            dataPromise = this.bigWigReader.readBigWigData(
                this.contig,
                tile.x,
                this.contig,
                tile.x + tile.span, // @! needs checking,
            ).then((rawData) => {
                // fill float array with zoom data regions
                let nChannels = 4;
                let floatArray = new Float32Array(tile.lodSpan * nChannels);

                for (let entry of rawData) {
                    let x0 = entry.start - tile.x;
                    let x1 = entry.end - tile.x;
                    let i0 = Math.round(x0 / lodDensity);
                    let i1 = Math.round(x1 / lodDensity);

                    let value = entry.value;

                    for (let i = i0; i < i1; i++) {
                        floatArray[i * nChannels] = value * dataMultiplier;
                    }
                }

                return floatArray;
            });
        }

        let tileLoader = this;

        return dataPromise.then((data) => {
            return {
                array: data,
                sequenceMinMax: {
                    min: 0,
                    max: 0,
                },
                dataUploaded: false,
                getTexture(device: GPUDevice): GPUTexture {
                    let payload: SignalTilePayload = this;

                    let blockPayload = tileLoader.getBlockPayload(tile);
                    let gpuTexture: GPUTexture = blockPayload.getTexture(device);

                    // upload this tile's row to the block if not already uploaded
                    if (!payload.dataUploaded) {
                        let nChannels = 4;
                        let dataWidthPixels = payload.array.length / nChannels;

                        console.log(`%cupload row ${tile.lodLevel}`, 'color: green');

                        gpuTexture.updateTextureData(
                            0,
                            TextureFormat.RGBA,
                            payload.array,
                            0, tile.blockRowIndex, // x, y
                            Math.min(gpuTexture.w, dataWidthPixels), 1, // w, h
                        );

                        payload.dataUploaded = true;
                    }

                    return gpuTexture;
                }
            }
        });
    }

    protected createBlockPayload(lodLevel: number, lodX: number, tileWidth: number, rows: number): BlockPayload {
        return {
            _gpuTexture: null,
            floatPacking: false,
            getTexture(device: GPUDevice) {
                let payload: BlockPayload = this;

                // allocate texture if it doesn't already exist
                if (payload._gpuTexture === null) {
                    // console.log(`%ccreate texture ${lodLevel}`, 'color: blue');

                    // use float packing if float textures are not supported
                    payload.floatPacking = !device.capabilities.floatTextures;

                    payload._gpuTexture = device.createTexture({
                        format: TextureFormat.RGBA,

                        // mipmapping should be turned off to avoid rows blending with one another
                        // if TILES_PER_BLOCK = 1 then mipmapping may be enabled
                        generateMipmaps: false,

                        // FireFox emits performance warnings when using texImage2D on uninitialized textures
                        // in our case it's faster to let the browser zero the texture rather than allocating another array buffer
                        mipmapData: null, //[new Uint8Array(BLOCK_SIZE * nChannels)],
                        width: tileWidth,
                        height: rows,
                        dataType: device.capabilities.floatTextures ? TextureDataType.FLOAT : TextureDataType.UNSIGNED_BYTE,

                        samplingParameters: {
                            magFilter: (lodLevel > 0 && device.capabilities.floatTexturesLinearFiltering) ? TextureMagFilter.LINEAR : TextureMagFilter.NEAREST,
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
                }

                return payload._gpuTexture;
            }
        }
    }

    protected releaseBlockPayload(payload: BlockPayload) {
        if (payload._gpuTexture != null) {
            payload._gpuTexture.delete();
            payload._gpuTexture = null;
        }
    }

}