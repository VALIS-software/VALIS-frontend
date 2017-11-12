
const axios = require('axios');

class GenomeAPI {
	constructor(baseUrl) {
		this.baseUrl = baseUrl;
	}

	getAnnotations() {
		return axios.get(`${this.baseUrl}/annotations`);
	}

	getAnnotation(annotationId) {
		return axios.get(`${this.baseUrl}/annotations/${annotationId}`);
	}

	getGenomes() {
		return axios.get(`${this.baseUrl}/genomes`);
	}

	getTracks(genomeId) {
		return axios.get(`${this.baseUrl}/genomes/${genomeId}`);
	}

	getTrack(genomeId, trackId) {
		return axios.get(`${this.baseUrl}/genomes/${genomeId}/${trackId}`);
	}

	getData(genomeId, trackId, startBp, endBp, samplingRate) {
		const samplingRateQuery = samplingRate === undefined ? '' : `?sampling_rate=${samplingRate}`;
		const requestUrl = `${this.baseUrl}/genomes/${genomeId}/${trackId}/${startBp}/${endBp}${samplingRateQuery}`;
		return axios.get(requestUrl);
	}

}

export default GenomeAPI;
