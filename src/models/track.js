const _ = require('underscore');

// WebGL requires min 4096 size for float textures. This could be smaller
// but we'd need to copy tiles into a single large texture.
const CACHE_TILE_SIZE = 1024;
const CACHE_SAMPLING_STEP_SIZE = 1024;

function floorToMultiple(x, k) {
  return Math.round((x % k === 0) ? x :  x + k - x % k - k);
}

function ceilToMultiple(x, k) {
  return Math.round((x % k === 0) ? x :  x + k - x % k);
}

// TODO: all this code really needs explicit tests... 
// probably some off-by-one errors in this 
// the tiles should all divide up evenly! re-write this!

class Track {
  constructor(api, genomeId, trackId, startBp, endBp) {
    this.api = api;
    this.genomeId = genomeId;
    this.trackId = trackId;
    this.startBp = startBp;
    this.endBp = endBp;
    this.cache = {}; // TODO: use a real cache here!
    this.inFlight = {};
    this.getTiles = _.throttle(this.getTiles.bind(this), 500);
    this.color = [Math.random(), Math.random(), Math.random()];
  }


  getTileSize() {
    return CACHE_TILE_SIZE;
  }

  getTiles(startBp, endBp, samplingRate) {
    // return the best tile with this data:
    const samplingRateForRequest = floorToMultiple(samplingRate, CACHE_SAMPLING_STEP_SIZE);
    const basePairsPerTile = CACHE_TILE_SIZE * samplingRateForRequest;
    const startCacheBp = floorToMultiple(startBp, basePairsPerTile);
    const endCacheBp = ceilToMultiple(endBp, basePairsPerTile);
    const tiles = [];
    for (let i = startCacheBp; i <= endBp; i+= basePairsPerTile) {
      const cacheKey = `${i}_${samplingRateForRequest}`;
      if ((this.cache[i] === undefined || this.cache[i][samplingRateForRequest] === undefined)) {
        if (!this.inFlight[cacheKey]) {
          this.loadData(i, samplingRateForRequest);
          this.inFlight[cacheKey] = true;
        } else {
          tiles.push(undefined);
        }
      } else {
        tiles.push(this.cache[i][samplingRateForRequest]);  
      }
    }
    return tiles;
  }

  loadData(tile, samplingRateForRequest) {
    const basePairsPerTile = CACHE_TILE_SIZE * samplingRateForRequest;
    
    const start = Math.floor(Math.max(tile, this.startBp));
    const end = Math.ceil(Math.min(this.endBp, tile + basePairsPerTile));

    if (start > end) return;

    const promise = this.api.getData(this.genomeId, this.trackId, start, end, Math.round(samplingRateForRequest));
    promise.then(data => {
      const rawData = data.data.values;
      if (!this.cache[tile]) this.cache[tile] = {};
      const cacheEntry = {
        startBp: data.data.startBp,
        endBp: data.data.startBp + basePairsPerTile,
        samplingRate: data.data.samplingRate,
      };
      // HACK (should not have to use RGBA textures)
      cacheEntry.values = [];
      for (let i = 0; i < CACHE_TILE_SIZE; i++) {
        const value = i < rawData.length ? rawData[i] : 0.0;
        cacheEntry.values[i*4] = i < rawData.length ? rawData[i] : 0.0;  
        cacheEntry.values[i*4 + 1] = value;
        cacheEntry.values[i*4 + 2] = value;
        cacheEntry.values[i*4 + 3] = i < rawData.length ? 1.0 : 0.5;
        cacheEntry.values[i*4] *= this.color[0];
        cacheEntry.values[i*4 + 1] *= this.color[1];
        cacheEntry.values[i*4 + 2] *= this.color2;
      }
      this.cache[tile][samplingRateForRequest] = cacheEntry;
    });
  }
}
export default Track;
