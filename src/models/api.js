import { LOCAL_API_URL } from '../helpers/constants.js';

import DataTrack from './dataTrack.js';
import GraphOverlay from './graphOverlay.js';
import AnnotationTrack from './annotationTrack.js';

const TRACK_CACHE = {};
const GRAPH_CACHE = {};
const ANNOTATION_CACHE = {};

const axios = require('axios');

class GenomeAPI {
	constructor(baseUrl) {
		if (baseUrl === undefined) {
			if (process.env.API_URL) {
				baseUrl = process.env.API_URL;
			} else if (process.env.dev) {
				baseUrl = LOCAL_API_URL;
			} else {
				baseUrl = '';
			}
		}
		this.baseUrl = baseUrl;
	}

	getAnnotations() {
		return axios.get(`${this.baseUrl}/annotations`).then(data => {
			return data.data;
		});
	}

	getGraphs() {
		return axios.get(`${this.baseUrl}/graphs`).then(data => {
			return data.data;
		});
	}

	getAnnotation(annotationId, query=null) {
		const cacheKey = annotationId + JSON.stringify(query);
		if (ANNOTATION_CACHE[cacheKey]) {
			return new Promise((resolve, reject) => {
				resolve(ANNOTATION_CACHE[cacheKey]);
			});
		} else {
			return axios.get(`${this.baseUrl}/annotations/${annotationId}`).then(data => {
				const trackData = data.data;
				const track = new AnnotationTrack(this, trackData.annotationId, query);
				ANNOTATION_CACHE[cacheKey] = track;
				return track;
			});
		}
	}

	getGraph(graphId, annotationId1, annotationId2) {
		const trackId = `${graphId},${annotationId1},${annotationId2}`;
		if (GRAPH_CACHE[trackId]) {
			return new Promise((resolve, reject) => {
				resolve(GRAPH_CACHE[trackId]);
			});
		} else {
			const track = new GraphOverlay(this, graphId, annotationId1, annotationId2);
			GRAPH_CACHE[trackId] = track;
			return new Promise((resolve, reject) => {
				resolve(GRAPH_CACHE[trackId]);
			});
		}
	}

	getGraphData(graphId, annotationId1, annotationId2, startBp, endBp, samplingRate=1) {
		const samplingRateQuery = `?sampling_rate=${samplingRate}`;
		const requestUrl = `${this.baseUrl}/graphs/${graphId}/${annotationId1}/${annotationId2}/${startBp}/${endBp}${samplingRateQuery}`;
		return axios.get(requestUrl);
	}

	getAnnotationData(annotationId, startBp, endBp, samplingRate=1, trackHeightPx=0, query={}) {
		const samplingRateQuery = `?sampling_rate=${samplingRate}&track_height_px=${trackHeightPx}`;
		const requestUrl = `${this.baseUrl}/annotations/${annotationId}/${startBp}/${endBp}${samplingRateQuery}`;
		return axios.post(requestUrl, query);
	}

	getTracks() {
		return axios.get(`${this.baseUrl}/tracks`).then(data => {
			return data.data;
		});
	}

	getTrack(trackId) {
		if (TRACK_CACHE[trackId]) {
			return new Promise((resolve, reject) => {
				resolve(TRACK_CACHE[trackId]);
			});
		} else {
			return axios.get(`${this.baseUrl}/tracks/${trackId}`).then(data => {
				const trackData = data.data;
				const track = new DataTrack(this, trackId, trackData.type);
				TRACK_CACHE[trackId] = track;
				return track;
			});
		}
	}

	getData(trackId, chromosome, startBp, endBp, samplingRate=1, trackHeightPx=0, aggregations=[]) {
		const aggregationStr = aggregations.join(',');
		const query = `?sampling_rate=${samplingRate}&track_height_px=${trackHeightPx}&aggregations=${aggregationStr}`;
		const requestUrl = `${this.baseUrl}/tracks/${trackId}/${chromosome}/${startBp}/${endBp}${query}`;
		return axios.get(requestUrl);
	}

	getTrackInfo() {
		return axios.get(`${this.baseUrl}/track_info`).then(data => {
			return data.data;
		});
	}

	getDistinctValues(index, query) {
		const requestUrl = `${this.baseUrl}/distinct_values/${index}`;
		return axios.post(requestUrl, query).then(data => {
			return data.data;
		});
	}

	getDetails(dataID) {
		return axios.get(`${this.baseUrl}/details/${dataID}`).then(data => {
			return data.data;
		});
	}

	getQueryResults(query, full=false) {
		let requestUrl = `${this.baseUrl}/query/basic`;
		if (full) {
			requestUrl = `${this.baseUrl}/query/full`;
		}
		return axios.post(requestUrl, query).then(data => {
			return data.data;
		});
	}
}

export default GenomeAPI;
