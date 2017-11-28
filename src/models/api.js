import { LOCAL_API_URL } from '../helpers/constants.js';
import Track from './track.js';

const axios = require('axios');

class GenomeAPI {
	constructor(baseUrl) {
		if (!baseUrl) baseUrl = LOCAL_API_URL;
		this.baseUrl = baseUrl;
	}

	getTracks() {
		return axios.get(`${this.baseUrl}/tracks`);
	}

	getTrack(trackId) {
		return axios.get(`${this.baseUrl}/tracks/${trackId}`).then(data => {
			const trackData = data.data;
			return new Track(this, trackData.trackId, trackData.startBp, trackData.endBp);
		});
	}

	getData(trackId, startBp, endBp, samplingRate) {
		const samplingRateQuery = samplingRate === undefined ? '' : `?sampling_rate=${samplingRate}`;
		const requestUrl = `${this.baseUrl}/tracks/${trackId}/${startBp}/${endBp}${samplingRateQuery}`;
		return axios.get(requestUrl);
	}
}

export default GenomeAPI;
