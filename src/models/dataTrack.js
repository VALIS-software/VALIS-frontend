
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

  getTooltipData(basePair, yOffset, startBp, endBp, samplingRate, trackHeightPx) {
    if (basePair < startBp || basePair > endBp) return null;
    const tiles = this.cache.get(startBp, endBp, samplingRate, trackHeightPx);
    
    // find the basePair in the tiles:
    let ret = null;
    tiles.forEach(tile => {
      if (basePair >= tile.range[0] && basePair <= tile.range[1]) {
        if (tile.tile.dataRange[0] > basePair || tile.tile.dataRange[1] < basePair) {
          ret = {
            value: null,
          };
        } else {
          const totalRange = (tile.tile.dataRange[1] - tile.tile.dataRange[0]);
          const idx = Math.floor((startBp - tile.tile.dataRange[0]) / totalRange);
          ret = {
            value: tile.tile.data[idx],
          };
        }
      }
    });
    return ret;
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
