
import Util from '../helpers/util.js';

const _ = require('underscore');
const xspans = require('xspans');
const uuid = require('uuid/v4');
const itree = require('interval-tree2');

export const CACHE_TILE_SIZE = 1024;
const CACHE_THROTTLE_MS = 250;

export class Tile {
  constructor(tileRange, dataRange, samplingRate, trackHeightPx, data, count=null) {
    this._tileRange = tileRange;
    this._dataRange = dataRange;
    this._samplingRate = samplingRate;
    this._trackHeightPx = trackHeightPx;
    this._data = data;
    this._count = count;
    data.guid = uuid();
  }

  get count() {
    return this._count;
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

export class GraphCache {
  constructor(minBp, maxBp, tileFetchFn, stepSampler=ExponentialCacheSampler()) {
    this.cache = {};
    this.inFlight = {};
    this.minBp = minBp;
    this.maxBp = maxBp;
    this.tileFetchFn = tileFetchFn;
    this.get = _.throttle(this.get.bind(this), CACHE_THROTTLE_MS);
    this.stepSampler = stepSampler;
    this.previous = [];
  }

  get tileSize() {
    return null;
  }

  clearCache() {
    this.cache = {};
  }

  get(startBp, endBp, samplingRate, trackHeightPx=0) {
    const stepSize = this.stepSampler(samplingRate);
    const start = Math.max(this.minBp, Util.floorToMultiple(startBp, stepSize));
    const end = Math.min(this.maxBp, Util.floorToMultiple(endBp, stepSize));
    const key = `${start}:${end}`;
    
    if (this.cache[key]) {
      this.previous = [{
        range: [start, end],
        tile: this.cache[key],
      }];
    }

    if (!this.inFlight[key]) {
      this.inFlight[key] = true;
      this.tileFetchFn(start, end, samplingRate, 0).then(tile => {
        this.cache[key] = tile;
      });
    }

    return this.previous;
  }
}

export class TileCache {
  constructor(minBp, maxBp, tileFetchFn, xSampler=ExponentialCacheSampler(), ySampler=ExponentialCacheSampler()) {
    this.cache = {};
    this.itree = new itree((maxBp-minBp) / 2.0);
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

  _getApproximate(samplingRate, range) {
    const matches = this.itree.search(range[0], range[1]);
    const sorted = _.sortBy(matches, match => {
      return Math.abs(match.id[1] - samplingRate);
    });

    let neededRange = range;
    const ret = [];
    for (let i = 0; i < sorted.length; i++) {
      const key = sorted[i].id;
      const matchRange = [sorted[i].start, sorted[i].end];
      const isect = xspans.intersect(matchRange, neededRange).getData();
      const tile = this.cache[key[0]][key[1]][key[2]];
      if (isect.length > 0) {
        neededRange = xspans.subtract(neededRange, isect);
        ret.push({
          heightPx: key[0],
          samplingRate: key[1],
          range: isect,
          tile: tile,
        });
      }
    }
    return ret;
  }

  get tileSize() {
    return CACHE_TILE_SIZE;
  }

  clear() {
    this.cache = {};
    this.inFlight = {};
    this.itree = new itree((this.maxBp-this.minBp) / 2.0);
  }

  _put(tileRange, samplingRate, trackHeightPx, data) {
    if (this.cache[trackHeightPx][samplingRate] === undefined) {
      this.cache[trackHeightPx][samplingRate] = {};
    }

    const tiles = this.cache[trackHeightPx][samplingRate];
    const bpPerTile = CACHE_TILE_SIZE * samplingRate;
    const idx = Math.floor(tileRange[0]/(bpPerTile));
    this.itree.add(tileRange[0], tileRange[1], [trackHeightPx, samplingRate, idx]);
    tiles[idx] = data;
  }

  get(startBp, endBp, samplingRate, trackHeightPx=0) {
    startBp = Math.round(startBp);
    endBp = Math.round(endBp);
    samplingRate = Math.round(samplingRate);
    trackHeightPx = Math.round(trackHeightPx);

    const intervalNeeded = xspans.intersect([this.minBp, this.maxBp], [startBp, endBp]);
    const results = this._getExact(startBp, endBp, samplingRate, trackHeightPx);
    let tiles = results.tiles;

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
      tiles = tiles.concat(this._getApproximate(req.samplingRate, req.range));
    });
    return tiles;
  }
}

