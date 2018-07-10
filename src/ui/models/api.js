import { resolve } from 'path';

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

const SUGGESTIONS_CACHE = {};

class GenomeAPI {

	constructor(baseUrl) {
		this.baseUrl = baseUrl;
	}

	getGraphs() {
		return axios.get(`${this.baseUrl}/graphs`).then(data => {
			return data.data;
		});
	}

	getGraphData(graphId, annotationId1, annotationId2, startBp, endBp, samplingRate = 1) {
		const samplingRateQuery = `?sampling_rate=${samplingRate}`;
		const requestUrl = `${this.baseUrl}/graphs/${graphId}/${annotationId1}/${annotationId2}/${startBp}/${endBp}${samplingRateQuery}`;
		return axios.get(requestUrl);
	}

	getTracks() {
		return axios.get(`${this.baseUrl}/tracks`).then(data => {
			return data.data;
		});
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

	getSuggestions(termType, searchText, maxResults = 100) {
		maxResults = Math.round(maxResults);
		const cacheKey = `${termType}|${searchText}|${maxResults}`;
		let ret = null;
		if (SUGGESTIONS_CACHE[cacheKey]) {
			ret = new Promise((resolve, reject) => {
				resolve(SUGGESTIONS_CACHE[cacheKey]);
			})
		} else {
			ret = axios.post(`${this.baseUrl}/suggestions`, {
				term_type: termType,
				search_text: searchText,
				max_results: maxResults,
			}).then(data => {
				SUGGESTIONS_CACHE[cacheKey] = data.data.results.slice(0);
				return data.data.results;
			});
		}
		return ret;
	}

	getUserProfile() {
		return axios.get(`${this.baseUrl}/user_profile`).then(data => {
			return data.data;
		});
	}
}

export default GenomeAPI;
