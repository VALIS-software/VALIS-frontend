
import Util from '../helpers/util.js';

const _ = require('underscore');
const xspans = require('xspans');
const uuid = require('uuid/v4');

export const CACHE_TILE_SIZE = 1024;
const CACHE_THROTTLE_MS = 250;

export class Tile {
  constructor(tileRange, dataRange, samplingRate, trackHeightPx, data) {
    this._tileRange = tileRange;
    this._dataRange = dataRange;
    this._samplingRate = samplingRate;
    this._trackHeightPx = trackHeightPx;
    this._data = data;
    data.guid = uuid();
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

  get trackHeightPx() {
    return this._trackHeightPx;
  }
}

export function ExponentialCacheSampler(k=4, min=1) {
  // samples the cache dimension using powers of k
  return (x) => {
    return Math.max(min, Util.floorToClosestPower(x, k));
  };
}

export function FixedCacheSampler(k=0) {
  // samples the cache dimension using a constant k
  return (x) => {
    return k;
  };
}

export function LinearCacheSampler(k=4096, min=4096) {
  // samples the cache dimension using multiples of k
  return (x) => {
    return Math.max(min, Util.floorToMultiple(x, k));
  };
}

export class TileCache {
  constructor(minBp, maxBp, tileFetchFn, xSampler=ExponentialCacheSampler(), ySampler=ExponentialCacheSampler()) {
    this.cache = {};
    this.inFlight = {};
    this.xSampler = xSampler;
    this.ySampler = ySampler;
    this.minBp = minBp;
    this.maxBp = maxBp;
    this.tileFetchFn = tileFetchFn;
    this.get = _.throttle(this.get.bind(this), CACHE_THROTTLE_MS);
    this.entryCount = 0;
  }

  _getExact(startBp, endBp, samplingRate, heightPx=0) {
    const finalSamplingRate = this.xSampler(samplingRate);
    const finalHeightPx = this.ySampler(heightPx);
    if (this.cache[finalHeightPx] === undefined) {
      this.cache[finalHeightPx] = {};
    }

    const entries = this.cache[finalHeightPx];

    if (this.cache[finalHeightPx][finalSamplingRate] === undefined) {
      this.cache[finalHeightPx][finalSamplingRate] = {};
    }

    const tiles = this.cache[finalHeightPx][finalSamplingRate];

    const bpPerTile = CACHE_TILE_SIZE * finalSamplingRate;
    const startIdx = Math.floor(startBp/bpPerTile);
    const numTiles = Math.ceil((endBp - startBp)/bpPerTile);
    const tilesFound = [];
    const tilesNeeded = [];
    
    for (let i = 0; i <= numTiles; i++) {
      let range = [(startIdx + i) * bpPerTile, (startIdx + i + 1) * bpPerTile];
      range = xspans.intersect([this.minBp, this.maxBp], range).getData();
      if (tiles[startIdx + i] !== undefined) {
        tilesFound.push({
          heightPx: finalHeightPx,
          samplingRate: finalSamplingRate,
          range: range,
          tile: tiles[startIdx + i],
        });
      } else if (range.length) {
        tilesNeeded.push({
          heightPx: finalHeightPx,
          samplingRate: finalSamplingRate,
          range: range,
        });
      }
    }

    return {
      tiles: tilesFound,
      needed: tilesNeeded,
    };
  }

  get tileSize() {
    return CACHE_TILE_SIZE;
  }

  clear() {
    this.cache = {};
    this.inFlight = {};
  }

  _put(tileRange, samplingRate, trackHeightPx, data) {
    if (this.cache[trackHeightPx][samplingRate] === undefined) {
      this.cache[trackHeightPx][samplingRate] = {};
    }

    const tiles = this.cache[trackHeightPx][samplingRate];
    const bpPerTile = CACHE_TILE_SIZE * samplingRate;
    tiles[Math.floor(tileRange[0]/(bpPerTile))] = data;
  }

  get(startBp, endBp, samplingRate, trackHeightPx=0) {
    startBp = Math.round(startBp);
    endBp = Math.round(endBp);
    samplingRate = Math.round(samplingRate);
    trackHeightPx = Math.round(trackHeightPx);

    const intervalNeeded = xspans.intersect([this.minBp, this.maxBp], [startBp, endBp]);
    const results = this._getExact(startBp, endBp, samplingRate, trackHeightPx);
    const tiles = results.tiles;

    const needed = results.needed;
    needed.forEach(req => {
      const cacheKey = JSON.stringify(req);
      if (!this.inFlight[cacheKey]) {
        this.inFlight[cacheKey] = true;
        this.tileFetchFn(req.range[0], req.range[1], req.samplingRate, req.heightPx).then(tile => {
          this._put(req.range, req.samplingRate, req.heightPx, tile);
          this.entryCount++;
        });
      }
    });
    return tiles;
  }
}
