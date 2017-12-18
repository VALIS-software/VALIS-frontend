
import Util from '../helpers/util.js';
import { Tile, TileCache, CACHE_TILE_SIZE } from './tileCache.js';
import { GENOME_LENGTH } from '../helpers/constants.js';
import Track, { TRACK_EVENT_LOADING } from './track.js';

class DataTrack extends Track {
  constructor(api, trackId) {
    super();
    this.api = api;
    this.trackId = trackId;
    this.loadData = this.loadData.bind(this);
    this.cache = new TileCache(0, GENOME_LENGTH, this.loadData);
    this._min = null;
    this._max = null;
  }

  get title() {
    return this.trackId;
  }

  getTooltipData(basePair, yOffset, startBp, endBp, samplingRate, trackHeightPx) {
    if (basePair < startBp || basePair > endBp) return null;
    const tiles = this.cache.get(startBp, endBp, samplingRate, 0);
    
    // find the basePair in the tiles:
    let ret = {
      value: null,
      valueNormalized: null,
    };
    tiles.forEach(tile => {
      if (basePair >= tile.range[0] && basePair <= tile.range[1]) {
        if (basePair >= tile.tile.dataRange[0]  && basePair <= tile.tile.dataRange[1]) {
          const totalRange = (tile.tile.dataRange[1] - tile.tile.dataRange[0]);
          const idx = Math.floor(CACHE_TILE_SIZE * (basePair - tile.tile.dataRange[0]) / totalRange);
          ret = {
            value: tile.tile.data[idx*4],
            valueNormalized: (tile.tile.data[idx*4] - this.min) / (this.max - this.min),
          };
        }
      }
    });
    return ret;
  }

  get min() {
    return this._min;
  }

  get max() {
    return this._max;
  }

  loadData(start, end, samplingRate, trackHeightPx) {
    this.notifyListeners(TRACK_EVENT_LOADING, true);
    const promise = this.api.getData(this.trackId, start, end, samplingRate, trackHeightPx);
    return promise.then(data => {
      const result = data.data;
      const rawData = data.data.values;
      // HACK (should not have to use RGBA textures)
      const values = new Float32Array(this.cache.tileSize * 4);
      let min = null;
      let max = null;
      for (let i = 0; i < this.cache.tileSize; i++) {
        const value = i < rawData.length ? rawData[i] : 0.0;
        values[i*4] = value;  
        values[i*4 + 1] = value;
        values[i*4 + 2] = value;
        values[i*4 + 3] = i < rawData.length ? 1.0 : 0.5;
        min = Math.min(value, min);
        max = max === null ? value : Math.max(value, max);
      }

      this._min = Math.min(min, this._min);
      this._max = this._max === null ? max : Math.max(max, this._max);
      this.notifyListeners(TRACK_EVENT_LOADING, false);
      return new Tile([start, end], [result.startBp, result.endBp], result.samplingRate, result.trackHeightPx, values);
    }, failure => {
      this.notifyListeners(TRACK_EVENT_LOADING, false);
    });
  }
}
export default DataTrack;
