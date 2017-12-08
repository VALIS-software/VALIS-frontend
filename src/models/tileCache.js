
import Util from '../helpers/util.js';

const _ = require('underscore');
const xspans = require('xspans');

export const CACHE_TILE_SIZE = 1024;
export const CACHE_SAMPLING_STEP_SIZE = 4096;
const CACHE_THROTTLE_MS = 250;

export class Tile {
  constructor(tileRange, dataRange, samplingRate, trackHeightPx, data) {
    this._tileRange = tileRange;
    this._dataRange = dataRange;
    this._samplingRate = samplingRate;
    this._trackHeightPx = trackHeightPx;
    this._data = data;
  }

  get data() {
    return this._data;
  }

  get tileRange() {
    return this._tileRange;
  }

  get dataRange() {
    return this._dataRange;
  }

  get samplingRate() {
    return this._samplingRate;
  }
}

export class TileCache {
  constructor(minBp, maxBp, tileFetchFn) {
    this.cache = {};
    this.inFlight = {};
    this.minBp = minBp;
    this.maxBp = maxBp;
    this.tileFetchFn = tileFetchFn;
    this.get = _.throttle(this.get.bind(this), CACHE_THROTTLE_MS);
  }

  _cacheKeyToRange(key) {
    const arr = key.split('.');
    return [parseFloat(arr[0]), parseFloat(arr[1])];
  }

  _getExact(tileRange, tileResolution) {
    const results = [];
    let intervalNeeded = xspans(tileRange);
    _.keys(this.cache).forEach(key => {
      const cacheEntryRange = this._cacheKeyToRange(key);
      const intersection = xspans.intersect(intervalNeeded, cacheEntryRange).getData();
      if (intersection.length > 0) {
        if (this.cache[key][tileResolution] !== undefined) {
          intervalNeeded = xspans.subtract(intervalNeeded, cacheEntryRange);
          const curr = this.cache[key][tileResolution];
          for (let i = 0; i < intersection.length / 2; i++) {
            const range = [intersection[i*2], intersection[i*2 + 1]];
            results.push({
              range: range,
              tile: curr,
            });
          }
        }
      }
    });
    return results;
  }

  _getAny(tileRange, tileResolution) {
    const results = [];
    let intervalNeeded = xspans(tileRange);

    const sortedKeys = _.chain(this.cache)
      .keys()
      .filter(key => {
        // keep only the cache entries that intersect the needed interval
        const cacheEntryRange = this._cacheKeyToRange(key);
        const intersection = xspans.intersect(intervalNeeded, cacheEntryRange).getData();
        return intersection.length > 0;
      })
      .sortBy(key => {
        // return the difference between target resolution and actual
        return Math.abs(_.keys(this.cache[key])[0] - tileResolution);
      })
      .value();

    // assemble the results greedily:
    sortedKeys.forEach(key => {
      const cacheEntryRange = this._cacheKeyToRange(key);
      const intersection = xspans.intersect(intervalNeeded, cacheEntryRange).getData();
      if (intersection.length > 0) {
        intervalNeeded = xspans.subtract(intervalNeeded, cacheEntryRange);
        const curr = _.keys(this.cache[key])[0];
        for (let i = 0; i < intersection.length / 2; i++) {
          const range = [intersection[i*2], intersection[i*2 + 1]];
          results.push({
            range: range,
            tile: this.cache[key][curr],
          });
        }
      }
    });
    return results;
  }

  _put(tileRange, tileResolution, trackHeightPx, data) {
    const tileRangeKey = `${tileRange[0]}.${tileRange[1]}`;
    if (!this.cache[tileRangeKey]) this.cache[tileRangeKey] = {};
    this.cache[tileRangeKey][tileResolution] = data;
  }

  get tileSize() {
    return CACHE_TILE_SIZE;
  }

  clear() {
    this.cache = {};
    this.inFlight = {};
  }

  get(startBp, endBp, samplingRate, trackHeightPx) {
    startBp = Math.round(startBp);
    endBp = Math.round(endBp);
    samplingRate = Math.round(samplingRate);
    // return the best tile with this data:
    const samplingRateForRequest = Util.floorToMultiple(samplingRate, CACHE_SAMPLING_STEP_SIZE);
    const basePairsPerTile = CACHE_TILE_SIZE * samplingRateForRequest;
    
    let tiles = this._getExact([startBp, endBp], samplingRateForRequest);

    // compute all the ranges that are missing:
    let intervalNeeded = xspans.intersect([this.minBp, this.maxBp], [startBp, endBp]);
    tiles.forEach(tile => {
      tile.range = xspans.intersect([this.minBp, this.maxBp], tile.range).getData();
      intervalNeeded = xspans.subtract(intervalNeeded, tile.range);
    });

    // send requests to fetch these tiles:
    const intervals = intervalNeeded.getData();
    for (let i = 0; i < intervals.length / 2; i++) {
      const range = [intervals[i*2], intervals[i*2 + 1]];
      const fetchRange = Util.discreteRangeContainingRange(range, basePairsPerTile);
      // check if we can add a different resolution tile from cache for the time being:
      tiles = tiles.concat(this._getAny(range, samplingRate));

      const tileRequests = [];
      for (let j = fetchRange[0]; j < fetchRange[1]; j+= basePairsPerTile) {
        tileRequests.push({
          start: j,
          end: j + basePairsPerTile,
          samplingRate: samplingRateForRequest,
          trackHeightPx: trackHeightPx,
        });
      }

      tileRequests.forEach(req => {
        const cacheKey = `${req.start}_${req.end}_${req.samplingRate}`;
        if (!this.inFlight[cacheKey]) {
          this.inFlight[cacheKey] = true;
          this.tileFetchFn(req.start, req.end, req.samplingRate, req.trackHeightPx).then(tile => {
            this._put([req.start, req.end], req.samplingRate, req.trackHeightPx, tile);
          });
        }
      });
    }
    return tiles;
  }
}
