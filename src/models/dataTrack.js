
import Util from '../helpers/util.js';
import { Tile, TileCache, CACHE_TILE_SIZE } from './tileCache.js';
import { GENOME_LENGTH } from '../helpers/constants.js';
import Track, { TRACK_EVENT_LOADING } from './track.js';

const _ = require('underscore');

class DataTrack extends Track {
  constructor(api, trackId) {
    super();
    this.api = api;
    this.trackId = trackId;
    this.loadData = this.loadData.bind(this);
    this.cache = new TileCache(0, GENOME_LENGTH, this.loadData);
    this._min = null;
    this._max = null;
    this.aggregations = ['max', 'mean', 'median', 'min'];
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
          const values = tile.tile.data.values;
          const aggregations = tile.tile.data.aggregations;
          const curr = [];
          const currNormalized = [];
          for (let i = 0; i < aggregations.length; i++) {
            const d = values[aggregations.length * idx + i];
            curr.push(d);
            currNormalized.push((d-this.min) / (this.max - this.min));
          }
          ret = {
            values: curr,
            aggregations: aggregations,
            valuesNormalized: currNormalized,
            positionNormalized: _.max(currNormalized),
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
    const promise = this.api.getData(this.trackId, start, end, samplingRate, trackHeightPx, this.aggregations);
    return promise.then(data => {
      const result = data.data;
      const rawData = result.values;
      const numSamples = result.numSamples;
      const dimensions = result.aggregations.length;

      const values = new Float32Array(this.cache.tileSize * 4);
      let min = null;
      let max = null;
      for (let i = 0; i < numSamples; i++) {
        for (let j = 0; j < dimensions; j++) {
          const curr = rawData[dimensions * i + j];
          values[4 * i + j] = curr;
          min = Math.min(curr, min);
          max = max === null ? curr : Math.max(curr, max);
        }
      }
      this._min = Math.min(min, this._min);
      this._max = this._max === null ? max : Math.max(max, this._max);
      this.notifyListeners(TRACK_EVENT_LOADING, false);
      const tileData = {
        values: values,
        aggregations: this.aggregations,
      };
      return new Tile([start, end], [result.startBp, result.endBp], result.samplingRate, result.trackHeightPx, tileData);
    }, failure => {
      this.notifyListeners(TRACK_EVENT_LOADING, false);
    });
  }
}
export default DataTrack;
