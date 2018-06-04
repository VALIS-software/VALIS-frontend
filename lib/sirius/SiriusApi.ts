/**
 * Temporary API for development 
 */

import axios, { AxiosRequestConfig, CancelToken } from 'axios';

export class SiriusApi {

    static caching: boolean = true;

    private static minMaxCache: {
        [path: string]: Promise<{ min: number, max: number }>
    } = {};

    static loadACGTSubSequence(
        sequencePath: string,
        lodLevel: number,
        lodStartBaseIndex: number,
        lodNBases: number,
    ): Promise<{
        array: Uint8Array,
        sequenceMinMax: {
            min: number,
            max: number,
        },
        indicesPerBase: number, 
    }> {
        let binPath = `/data/${sequencePath}/${lodLevel}.bin`;
        let minMaxPath = binPath + '.minmax';

        // @! data format may change for certain LODs in the future
        let elementSize_bits = 8;

        let dataPromise = SiriusApi.loadArray(binPath, elementSize_bits, lodStartBaseIndex * 4, lodNBases * 4, ArrayFormat.UInt8);

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
                'Range': `bytes=${byteRange.start.toFixed(0)}-${byteRange.end.toFixed(0)}`
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

    private static log2(x: number) {
        return Math.log(x) / Math.LN2;
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