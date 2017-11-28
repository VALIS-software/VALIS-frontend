
import Util from '../helpers/util.js';

const _ = require('underscore');
const xspans = require('xspans');

const CACHE_TILE_SIZE = 1024;
const CACHE_SAMPLING_STEP_SIZE = 1024;
const REQUEST_THROTTLE_MS = 250;

let NUM_TRACKS = 0;

// TODO: all code in this file really needs explicit tests... 
// probably some off-by-one errors in this 
// the tiles should all divide up evenly! re-write this!

class Tile {
  constructor(tileRange, dataRange, samplingRate, data) {
    this._tileRange = tileRange;
    this._dataRange = dataRange;
    this._samplingRate = samplingRate;
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


class SimpleTileCache {
  constructor() {
    this.cache = {};
  }

  contains(tileRange, tileResolution) {
    return (this.cache[tileRange] && this.cache[tileRange][tileResolution]);
  }

  cacheKeyToRange(key) {
    const arr = key.split('.');
    return [parseFloat(arr[0]), parseFloat(arr[1])];
  }

  get(tileRange, tileResolution) {
    const results = [];
    let intervalNeeded = xspans(tileRange);
    _.keys(this.cache).forEach(key => {
      const cacheEntryRange = this.cacheKeyToRange(key);
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

  getAny(tileRange, tileResolution) {
    const results = [];
    let intervalNeeded = xspans(tileRange);

    const sortedKeys = _.chain(this.cache)
      .keys()
      .filter(key => {
        // keep only the cache entries that intersect the needed interval
        const cacheEntryRange = this.cacheKeyToRange(key);
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
      const cacheEntryRange = this.cacheKeyToRange(key);
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

  put(tileRange, tileResolution, data) {
    const tileRangeKey = `${tileRange[0]}.${tileRange[1]}`;
    if (!this.cache[tileRangeKey]) this.cache[tileRangeKey] = {};
    this.cache[tileRangeKey][tileResolution] = data;
  }
}


class Track {
  constructor(api, trackId, startBp, endBp) {
    this.api = api;
    this.trackGuid = NUM_TRACKS++;
    this.trackId = trackId;
    this.startBp = startBp;
    this.endBp = endBp;
    this.cache = new SimpleTileCache();
    this.inFlight = {};
    this.loadData = _.throttle(this.loadData.bind(this), REQUEST_THROTTLE_MS);
    this.color = [Math.random(), Math.random(), Math.random()];
  }


  getTileSize() {
    return CACHE_TILE_SIZE;
  }

  getTiles(startBp, endBp, samplingRate) {
    startBp = Math.round(startBp);
    endBp = Math.round(endBp);
    samplingRate = Math.round(samplingRate);
    // return the best tile with this data:
    const samplingRateForRequest = Util.floorToMultiple(samplingRate, CACHE_SAMPLING_STEP_SIZE);
    const basePairsPerTile = CACHE_TILE_SIZE * samplingRateForRequest;
    

    let tiles = this.cache.get([startBp, endBp], samplingRateForRequest);

    // compute all the ranges that are missing:
    let intervalNeeded = xspans.intersect([this.startBp, this.endBp], [startBp, endBp]);
    tiles.forEach(tile => {
      tile.range = xspans.intersect([this.startBp, this.endBp], tile.range).getData();
      intervalNeeded = xspans.subtract(intervalNeeded, tile.range);
    });

    // send requests to fetch these tiles:
    const intervals = intervalNeeded.getData();
    for (let i = 0; i < intervals.length / 2; i++) {
      const range = [intervals[i*2], intervals[i*2 + 1]];
      const fetchRange = Util.discreteRangeContainingRange(range, basePairsPerTile);
      // check if we can add a different resolution tile from cache for the time being:
      tiles = tiles.concat(this.cache.getAny(range, samplingRate));

      for (let j = fetchRange[0]; j < fetchRange[1]; j+= basePairsPerTile) {
        const cacheKey = `${j}_${j + basePairsPerTile}_${samplingRateForRequest}`;
        if (!this.inFlight[cacheKey]) {
          this.loadData(j, j + basePairsPerTile, samplingRateForRequest);
        }
      }
    }
    return tiles;
  }

  getAnnotations(startBp, endBp, samplingRate, trackHeightPx) {
    return [{
      id: '1',
      metadata: {
        title: 'GENE1',
      },
      startBp: 10000,
      endBp: 1000000000,
      yOffsetPx: 0,
      heightPx: 25,
    },
    {
      id: '2',
      metadata: {
        title: 'GENE2',
      },
      startBp: 500000,
      endBp: 100000000,
      yOffsetPx: 50,
      heightPx: 25,
    }];
  }

  loadData(start, end, samplingRateForRequest) {
    const cacheKey = `${start}_${end}_${samplingRateForRequest}`;
    this.inFlight[cacheKey] = true;
    const promise = this.api.getData(this.trackId, start, end, samplingRateForRequest);
    promise.then(data => {
      const result = data.data;
      const rawData = data.data.values;
      // HACK (should not have to use RGBA textures)
      const values = [];
      for (let i = 0; i < CACHE_TILE_SIZE; i++) {
        const value = i < rawData.length ? rawData[i] : 0.0;
        values[i*4] = value;  
        values[i*4 + 1] = value;
        values[i*4 + 2] = value;
        values[i*4 + 3] = i < rawData.length ? 1.0 : 0.5;
      }
      const cacheEntry = new Tile([start, end], [result.startBp, result.endBp], result.samplingRate, values);
      this.cache.put([start, end], samplingRateForRequest, cacheEntry);
    });
  }
}
export default Track;
