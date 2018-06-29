const CHAOS_ENABLED = false;

const chaos = (_axios, probabilityOfFailure) => {
	const oldGet = _axios.get;
	const oldPost = _axios.post;
	_axios.get = (x) => {
		if (Math.random() < probabilityOfFailure) {
			return Promise.reject({ errorMsg: 'mock error' });
		} else {
			return oldGet(x);
		}
	}

	_axios.post = (x, d) => {
		if (Math.random() < probabilityOfFailure) {
			return Promise.reject({ errorMsg: 'mock error' });
		} else {
			return oldPost(x, d);
		}
	}
	return _axios;
}

let axios = require('axios');

if (CHAOS_ENABLED) {
	axios = chaos(axios, 0.5);
}

class GenomeAPI {

	constructor(baseUrl) {
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

	getAnnotation(annotationId, query = null) {
		throw '@! refactor todo';
	}

	getGraph(graphId, annotationId1, annotationId2) {
		throw `@! refactor todo`;
	}

	getGraphData(graphId, annotationId1, annotationId2, startBp, endBp, samplingRate = 1) {
		const samplingRateQuery = `?sampling_rate=${samplingRate}`;
		const requestUrl = `${this.baseUrl}/graphs/${graphId}/${annotationId1}/${annotationId2}/${startBp}/${endBp}${samplingRateQuery}`;
		return axios.get(requestUrl);
	}

	getAnnotationData(annotationId, contig, startBp, endBp, samplingRate = 1, trackHeightPx = 0, query = {}) {
		const samplingRateQuery = `?sampling_rate=${samplingRate}&track_height_px=${trackHeightPx}`;
		const requestUrl = `${this.baseUrl}/annotations/${annotationId}/${contig}/${startBp}/${endBp}${samplingRateQuery}`;
		return axios.post(requestUrl, query);
	}

	getTracks() {
		return axios.get(`${this.baseUrl}/tracks`).then(data => {
			return data.data;
		});
	}

	getTrack(trackId) {
		throw '@! refactor todo';
	}

	getData(trackId, contig, startBp, endBp, samplingRate = 1, trackHeightPx = 0, aggregations = []) {
		const aggregationStr = aggregations.join(',');
		const query = `?sampling_rate=${samplingRate}&track_height_px=${trackHeightPx}&aggregations=${aggregationStr}`;
		const requestUrl = `${this.baseUrl}/tracks/${trackId}/${contig}/${startBp}/${endBp}${query}`;
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

	getQueryResults(query, full = false, startIdx = null, endIdx = null) {
		let requestUrl = `${this.baseUrl}/query/basic`;
		if (full) {
			requestUrl = `${this.baseUrl}/query/full`;
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

	parseSearchQuery(query) {
		return axios.post(`${this.baseUrl}/search`, { query: query }).then(data => {
			return data.data;
		});
	}
}

export default GenomeAPI;
