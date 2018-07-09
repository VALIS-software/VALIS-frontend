/**
 * Temporary API for development 
 */

import axios, { AxiosRequestConfig, CancelToken } from 'axios';

import { TileContent } from './AnnotationTileset';

export class SiriusApi {

    public static apiUrl: string = '';

    private static minMaxCache: {
        [path: string]: Promise<{ min: number, max: number }>
    } = {};

    static loadAnnotations(
        sequenceId: string,
        macro: boolean,
        startBaseIndex: number,
        span: number,
    ): Promise<TileContent> {
        let jsonPath = `https://valis-tmp-data.firebaseapp.com/data/${sequenceId}/annotation${macro ? '-macro' : ''}/${startBaseIndex},${span}.json`;
        return axios.get(jsonPath).then((a) => {
            return a.data;
        });
    }

    static loadACGTSubSequence(
        sequenceId: string,
        lodLevel: number,
        lodStartBaseIndex: number,
        lodSpan: number,
    ): Promise<{
        array: Uint8Array,
        sequenceMinMax: {
            min: number,
            max: number,
        },
        indicesPerBase: number,
    }> {
        if (sequenceId === '__SAMPLE__') {
            return this.sample_LoadACGTSubSequence(sequenceId, lodLevel, lodStartBaseIndex, lodSpan);
        }

        let samplingDensity = (1 << lodLevel);
        let startBasePair = samplingDensity * lodStartBaseIndex + 1;
        let spanBasePair = lodSpan * samplingDensity;
        let endBasePair = startBasePair + spanBasePair - 1;
        let url = `${this.apiUrl}/datatracks/sequence/chr1/${startBasePair}/${endBasePair}?sampling_rate=${samplingDensity}`;

        return axios({
            method: 'get',
            url: url,
            responseType: 'arraybuffer',
            headers: {},
        }).then((a) => {
            let payloadArray = new Float32Array(this.parseSiriusBinaryResponse(a.data));
            let baseCount = payloadArray.length / 4;

            if (baseCount > lodSpan) {
                console.warn(`Payload too large, expected ${lodSpan} units but received ${baseCount} units`);
            }

            // build compressed array
            let compressedArray = new Uint8Array(payloadArray.length);
            // find min/max
            let min = Infinity;
            let max = -Infinity;
            for (let i = 0; i < baseCount; i++) {
                let v0 = payloadArray[i * 4 + 0];
                let v1 = payloadArray[i * 4 + 1];
                let v2 = payloadArray[i * 4 + 2];
                let v3 = payloadArray[i * 4 + 3];
                min = Math.min(min, v0);
                min = Math.min(min, v1);
                min = Math.min(min, v2);
                min = Math.min(min, v3);
                max = Math.max(max, v0);
                max = Math.max(max, v1);
                max = Math.max(max, v2);
                max = Math.max(max, v3);
            }

            // use min/max to compress floats to bytes
            let delta = max - min;
            let scaleFactor = delta === 0 ? 0 : (1/delta);
            for (let i = 0; i < baseCount; i++) {
                compressedArray[i * 4 + 0] = Math.round(Math.min((payloadArray[i * 4 + 0] - min) * scaleFactor, 1.) * 0xFF); // A
                compressedArray[i * 4 + 1] = Math.round(Math.min((payloadArray[i * 4 + 3] - min) * scaleFactor, 1.) * 0xFF); // C
                compressedArray[i * 4 + 2] = Math.round(Math.min((payloadArray[i * 4 + 2] - min) * scaleFactor, 1.) * 0xFF); // G 
                compressedArray[i * 4 + 3] = Math.round(Math.min((payloadArray[i * 4 + 1] - min) * scaleFactor, 1.) * 0xFF); // T
            }

            return {
                array: compressedArray,
                sequenceMinMax: {
                    min: min,
                    max: max,
                },
                indicesPerBase: 4,
            }
        });
    }

    static loadSignal(
        sequenceId: string,
        lodLevel: number,
        lodStartBaseIndex: number,
        lodSpan: number
    ) {
        let samplingDensity = (1 << lodLevel);
        let startBasePair = samplingDensity * lodStartBaseIndex + 1;
        let spanBasePair = lodSpan * samplingDensity;
        let endBasePair = startBasePair + spanBasePair - 1;
        let url = `${this.apiUrl}/datatracks/ENCFF918ESR/chr1/${startBasePair}/${endBasePair}?sampling_rate=${samplingDensity}`;

        return axios({
            method: 'get',
            url: url,
            responseType: 'arraybuffer',
            headers: {},
        }).then((a) => {
            let arraybuffer = this.parseSiriusBinaryResponse(a.data);
            let payloadArray = new Float32Array(arraybuffer);
            console.log(arraybuffer, payloadArray);
            return payloadArray;
        });
    }

    static sample_LoadACGTSubSequence(
        sequenceId: string,
        lodLevel: number,
        lodStartBaseIndex: number,
        lodSpan: number,
    ): Promise<{
        array: Uint8Array,
        sequenceMinMax: {
            min: number,
            max: number,
        },
        indicesPerBase: number, 
    }> {
        let binPath = `data/chromosome1/dna/${lodLevel}.bin`;
        let minMaxPath = binPath + '.minmax';

        // @! data format may change for certain LODs in the future
        let elementSize_bits = 8;

        let dataPromise = SiriusApi.loadArray(binPath, elementSize_bits, lodStartBaseIndex * 4, lodSpan * 4, ArrayFormat.UInt8);

        let minMaxPromise = SiriusApi.minMaxCache[minMaxPath];
        
        if (minMaxPromise === undefined) {
            minMaxPromise = axios.get(minMaxPath, { responseType: 'json' }).then((a) => {
                let minMax: { min: number, max: number } = a.data;
                return minMax;
            });
            SiriusApi.minMaxCache[minMaxPath] = minMaxPromise;            
        }
        
        return Promise.all([dataPromise, minMaxPromise])
            .then((a) => {
                return {
                    array: a[0],
                    sequenceMinMax: a[1],
                    indicesPerBase: 4,
                }
            });
    }

    private static parseSiriusBinaryResponse(arraybuffer: ArrayBuffer) {
        let byteView = new Uint8Array(arraybuffer);

        // find the start of the payload
        let nullByteIndex = 0;
        // let jsonHeader = '';
        for (let i = 0; i < arraybuffer.byteLength; i++) {
            let byte = byteView[i];
            if (byte === 0) {
                nullByteIndex = i;
                break;
            } else {
                // jsonHeader += String.fromCharCode(byte);
            }
        }

        let payloadBytes = arraybuffer.slice(nullByteIndex + 1);
        return payloadBytes;
    }

    private static loadArray<T extends keyof ArrayFormatMap>(
        path: string,
        elementSize_bits: number,
        elementIndex: number,
        nElements: number,
        targetFormat: T,
        cancelToken?: CancelToken,
    ): Promise<ArrayFormatMap[T]> {
        let element0_bits = elementIndex * elementSize_bits;
        let byte0 = Math.floor(element0_bits / 8);
        let nBytes = Math.ceil(nElements * elementSize_bits / 8);
        let offset_bits = element0_bits % 8;

        // determine byte range from dataFormat
        let byteRange = {
            start: byte0,
            end: byte0 + nBytes - 1,
        };

        return axios({
            method: 'get',
            url: path,
            responseType: 'arraybuffer',
            headers: {
                'Range': `bytes=${byteRange.start.toFixed(0)}-${byteRange.end.toFixed(0)}`,
                'Cache-Control': 'no-cache', // @! work around chrome bug
            },
            cancelToken: cancelToken
        }).then((a) => {
            let unpackingRequired = !((targetFormat === ArrayFormat.UInt8) && (elementSize_bits === 8));

            if (unpackingRequired) {

                let bytes: Uint8Array = new Uint8Array(a.data);

                // allocate output
                let outputArray: ArrayFormatMap[T];

                switch (targetFormat) {
                    case ArrayFormat.Float32:
                        outputArray = new Float32Array(nElements);
                        break;
                    case ArrayFormat.UInt8:
                        outputArray = new Uint8Array(nElements);
                        break;
                }

                for (let element = 0; element < nElements; element++) {
                    let bitIndex0 = element * elementSize_bits + offset_bits;
                    let bitOffset = bitIndex0 % 8;
                    let byteIndex0 = Math.floor(bitIndex0 / 8);
                    /*
                    let uint32 = composeUInt32(
                        bytes[byteIndex0 + 0],
                        bytes[byteIndex0 + 1],
                        bytes[byteIndex0 + 2],
                        bytes[byteIndex0 + 3]
                    );

                    outputArray[element] = uint32 & mask32(offset, length) <bit shift>;
                    */
                }

                throw `Unpacking data not yet supported`;

            } else {
                return new Uint8Array(a.data);
            }
        });
    }

}

enum ArrayFormat {
    Float32 = 'f32',
    UInt8 = 'ui8',
}

interface ArrayFormatMap {
    [ArrayFormat.Float32]: Float32Array,
    [ArrayFormat.UInt8]: Uint8Array,
}

export default SiriusApi;