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
    private static suggestionsCache: {
        [key: string]: Array<any>
    } = {};

    static loadAnnotations(
        contig: string,
        macro: boolean,
        startBaseIndex: number,
        span: number,
    ): Promise<TileContent> {
        let jsonPath = `https://valis-tmp-data.firebaseapp.com/data/annotation/${contig}${macro ? '-macro' : ''}/${startBaseIndex},${span}.json`;
        return axios.get(jsonPath).then((a) => {
            return a.data;
        });
    }

    static loadACGTSubSequence(
        contig: string,
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
        let samplingDensity = (1 << lodLevel);
        let startBasePair = samplingDensity * lodStartBaseIndex + 1;
        let spanBasePair = lodSpan * samplingDensity;
        let endBasePair = startBasePair + spanBasePair - 1;
        let url = `${this.apiUrl}/datatracks/sequence/${contig}/${startBasePair}/${endBasePair}?sampling_rate=${samplingDensity}`;

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

    private static _contigInfoPromise: Promise<{
        [contig: string]: {
            start: number, // start base (i.e. startIndex + 1)
            length: number,
        }
    }>;
    private static getContigInfoPromise() {
        if (this._contigInfoPromise == null) {
            // initialize the promise
            this._contigInfoPromise = axios.get(`${SiriusApi.apiUrl}/contig_info`).then(data => {
                let infoArray: Array<{
                    name: string,
                    start: number,
                    length: number,
                }> = data.data;

                // create contig info map
                let contigInfoMap: { [contig: string]: {
                    start: number,
                    length: number,
                } } = {};
                for (let item of infoArray) {
                    contigInfoMap[item.name] = {
                        start: item.start,
                        length: item.length
                    }
                }

                return contigInfoMap;
            });
        }

        return this._contigInfoPromise;
    }

    static getContigInfo(contig: string): Promise<{ length: number }> {
        return this.getContigInfoPromise().then((infoMap) => {
            let info = infoMap[contig];
            if (info == null) {
                throw `No contig info available for "${contig}"`;
            } else {
                return info;
            }
        });
    }

    static getContigs(): Promise<Array<string>> {
        return this.getContigInfoPromise().then((infoMap) => Object.keys(infoMap));
    }

    private static _sortedContigsPromise: Promise<Array<string>>;
    static getContigsSorted(): Promise<Array<string>> {
        if (this._sortedContigsPromise == null) {
            this._sortedContigsPromise = this.getContigs().then((contigs) => {
                let sortedNaturally = contigs.sort((a, b) => {
                    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
                });
                return sortedNaturally;
            });
        }
        return this._sortedContigsPromise;
    }

    static getGraphs() {
        return axios.get(`${this.apiUrl}/graphs`).then(data => {
            return data.data;
        });
    }

    static getGraphData(graphId: string, annotationId1: string, annotationId2: string, startBp: number, endBp: number, samplingRate = 1) {
        const samplingRateQuery = `?sampling_rate=${samplingRate}`;
        const requestUrl = `${this.apiUrl}/graphs/${graphId}/${annotationId1}/${annotationId2}/${startBp}/${endBp}${samplingRateQuery}`;
        return axios.get(requestUrl);
    }

    static getTracks() {
        return axios.get(`${this.apiUrl}/tracks`).then(data => {
            return data.data;
        });
    }

    static getTrackInfo() {
        return axios.get(`${this.apiUrl}/track_info`).then(data => {
            return data.data;
        });
    }

    static getDistinctValues(key: string, query: any) {
        const requestUrl = `${this.apiUrl}/distinct_values/${key}`;
        return axios.post(requestUrl, query).then(data => {
            return data.data;
        });
    }

    static getDetails(dataID: string) {
        return axios.get(`${this.apiUrl}/details/${dataID}`).then(data => {
            return data.data;
        });
    }

    static getQueryResults(query: any, full = false, startIdx: number = null, endIdx: number = null) {
        let requestUrl = `${this.apiUrl}/query/basic`;
        if (full) {
            requestUrl = `${this.apiUrl}/query/full`;
        }
        if (query.specialGWASQuery) {
            requestUrl = `${this.apiUrl}/query/gwas`;
        }
        const options = [];
        if (startIdx !== null) {
            options.push(`result_start=${startIdx}`);
        }
        if (endIdx !== null) {
            options.push(`result_end=${endIdx}`);
        }
        if (options.length > 0) {
            requestUrl = `${requestUrl}?` + options.join('&');
        }
        return axios.post(requestUrl, query).then(data => {
            return data.data;
        });
    }

    // this special API is created for the "all-variants" track
    static getAllVariantTrackData(contig: string, startBp: number, endBp: number) {
        return axios.get(`${this.apiUrl}/all_variant_track_data/${contig}/${startBp}/${endBp}`).then(data => {
            return data.data;
        });
    }

    static getVariantTrackData(contig: string, startBp: number, endBp: number, query: any) {
        return axios.post(`${this.apiUrl}/variant_track_data/${contig}/${startBp}/${endBp}`, query).then(data => {
            return data.data;
        });
    }

    static getIntervalTrackData(contig: string, startBp: number, endBp: number, query: any) {
        return axios.post(`${this.apiUrl}/interval_track_data/${contig}/${startBp}/${endBp}`, query).then(data => {
            return data.data;
        });
    }

    static getSuggestions(termType: string, searchText: string, maxResults = 100) {
        maxResults = Math.round(maxResults);
        const cacheKey = `${termType}|${searchText}|${maxResults}`;
        let ret = null;
        if (this.suggestionsCache[cacheKey]) {
            ret = new Promise((resolve, reject) => {
                resolve(this.suggestionsCache[cacheKey]);
            })
        } else {
            ret = axios.post(`${this.apiUrl}/suggestions`, {
                term_type: termType,
                search_text: searchText,
                max_results: maxResults,
            }).then(data => {
                this.suggestionsCache[cacheKey] = data.data.results.slice(0);
                return data.data.results;
            });
        }
        return ret;
    }

    static getUserProfile() {
        return axios.get(`${this.apiUrl}/user_profile`).then(data => {
            return data.data;
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
                // jsonHeader += String.fromCharCode(byte); // we usually don't care about the json header since it's a copy of input parameters
            }
        }

        let payloadBytes = arraybuffer.slice(nullByteIndex + 1);
        return payloadBytes;
    }

    static uploadFile(fileType: string, file: any, onUploadProgress: any = null) {
        const data = new FormData();
        data.append("file", file);
        data.append("fileType", fileType);
        const config = {
            onUploadProgress: onUploadProgress,
        }
        return axios.post(`${this.apiUrl}/user_files`, data, config);
    }

    static getUserFiles() {
        return axios.get(`${this.apiUrl}/user_files`).then(data => {
            return data.data;
        });
    }

    static deleteUserFile(fileID: string) {
        const requestConfig = {
            params: {
                fileID: fileID
            },
        };
        return axios.delete(`${this.apiUrl}/user_files`, requestConfig);
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
