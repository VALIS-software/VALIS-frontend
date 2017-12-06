import { LOCAL_API_URL } from '../helpers/constants.js';

import DataTrack from './dataTrack.js';
import AnnotationTrack from './annotationTrack.js';

const TRACK_CACHE = {};
const ANNOTATION_CACHE = {};

const axios = require('axios');

class GenomeAPI {
	constructor(baseUrl) {
		if (!baseUrl) baseUrl = LOCAL_API_URL;
		this.baseUrl = baseUrl;
	}

	getAnnotations() {
		return axios.get(`${this.baseUrl}/annotations`);
	}

	getAnnotation(annotationIds) {
		const cacheKey = annotationIds.join(',');
		if (ANNOTATION_CACHE[cacheKey]) {
			return new Promise((resolve, reject) => {
				resolve(ANNOTATION_CACHE[cacheKey]);
			});
		} else {
			return axios.get(`${this.baseUrl}/annotations/${cacheKey}`).then(data => {
				const trackData = data.data;
				const track = new AnnotationTrack(this, [trackData.annotationId], trackData.startBp, trackData.endBp);
				ANNOTATION_CACHE[cacheKey] = track;
				return track;
			});	
		}
	}

	getAnnotationData(annotationIds, startBp, endBp, samplingRate=1, trackHeightPx=0) {
		const samplingRateQuery = `?sampling_rate=${samplingRate}&track_height_px=${trackHeightPx}`;
		const requestUrl = `${this.baseUrl}/annotations/${annotationIds.join(',')}/${startBp}/${endBp}${samplingRateQuery}`;
		return axios.get(requestUrl);
	}

	getTracks() {
		return axios.get(`${this.baseUrl}/tracks`);
	}

	getTrack(trackId) {
		if (TRACK_CACHE[trackId]) {
			return new Promise((resolve, reject) => {
				resolve(TRACK_CACHE[trackId]);
			});
		} else {
			return axios.get(`${this.baseUrl}/tracks/${trackId}`).then(data => {
				const trackData = data.data;
				const track = new DataTrack(this, trackData.trackId, trackData.startBp, trackData.endBp);
				TRACK_CACHE[trackId] = track;
				return track;
			});	
		}
	}

	getData(trackId, startBp, endBp, samplingRate=1, trackHeightPx=0) {
		const samplingRateQuery = `?sampling_rate=${samplingRate}&track_height_px=${trackHeightPx}`;
		const requestUrl = `${this.baseUrl}/tracks/${trackId}/${startBp}/${endBp}${samplingRateQuery}`;
		return axios.get(requestUrl);
	}
}

export default GenomeAPI;
