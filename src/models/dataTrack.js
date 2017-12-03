
import Util from '../helpers/util.js';
import { Tile, TileCache } from './tileCache.js';
import { GENOME_LENGTH } from '../helpers/constants.js';

class DataTrack {
  constructor(api, trackId) {
    this.api = api;
    this.trackId = trackId;
    this.loadData = this.loadData.bind(this);
    this.cache = new TileCache(0, GENOME_LENGTH, this.loadData);
  }

  clearCache() {
    this.cache.clear();
  }

  getTiles(startBp, endBp, samplingRate, trackHeightPx) {
    return this.cache.get(startBp, endBp, samplingRate, trackHeightPx);
  }

  loadData(start, end, samplingRate, trackHeightPx) {
    const promise = this.api.getData(this.trackId, start, end, samplingRate, trackHeightPx);
    return promise.then(data => {
      const result = data.data;
      const rawData = data.data.values;
      // HACK (should not have to use RGBA textures)
      const values = [];
      for (let i = 0; i < this.cache.tileSize; i++) {
        const value = i < rawData.length ? rawData[i] : 0.0;
        values[i*4] = value;  
        values[i*4 + 1] = value;
        values[i*4 + 2] = value;
        values[i*4 + 3] = i < rawData.length ? 1.0 : 0.5;
      }
      return new Tile([start, end], [result.startBp, result.endBp], result.samplingRate, result.trackHeightPx, values);
    });
  }
}
export default DataTrack;
