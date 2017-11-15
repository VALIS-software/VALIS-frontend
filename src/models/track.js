const _ = require('underscore');

// WebGL requires min 4096 size for float textures. This could be smaller
// but we'd need to copy tiles into a single large texture.
const CACHE_TILE_SIZE = 1024;
const CACHE_SAMPLING_STEP_SIZE = 256;

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
      if (this.cache[cacheKey] === undefined && !this.inFlight[cacheKey]) {
        this.inFlight[cacheKey] = true;
        this.loadData(i, samplingRateForRequest);
        // find the next best cache value:
      } else {
        tiles.push(this.cache[cacheKey]);  
      }
    }
    return tiles;
  }

  loadData(tile, samplingRateForRequest) {
    const promises = [];
    const basePairsPerTile = CACHE_TILE_SIZE * samplingRateForRequest;
    
    // TODO: you can downsample existing cached data but for now the samplingRateForRequest must match!
    const cacheKey = `${tile}_${samplingRateForRequest}`;

    const start = Math.floor(Math.max(tile, this.startBp));
    const end = Math.ceil(Math.min(this.endBp, tile + basePairsPerTile));

    if (start > end) return;

    const promise = this.api.getData(this.genomeId, this.trackId, start, end, Math.round(samplingRateForRequest));

    const finalPromise = promise.then(data => {
      const rawData = data.data.values;
      console.log('raw data...');
      console.log('cacheKey', cacheKey);
      console.log(data.data);
      console.log(rawData[rawData.length - 1]);
      console.log('---');
      this.cache[cacheKey] = {
        startBp: data.data.startBp,
        endBp: data.data.endBp,
        samplingRate: data.data.samplingRate,
      };
      // HACK (should not have to use RGBA textures)
      this.cache[cacheKey].values = [];
      console.log(rawData.length);
      for (let i = 0; i < CACHE_TILE_SIZE; i++) {
        const value = i < rawData.length ? rawData[i] : 0.0;
        this.cache[cacheKey].values[i*4] = i < rawData.length ? rawData[i] : 0.1;  
        this.cache[cacheKey].values[i*4 + 1] = value;
        this.cache[cacheKey].values[i*4 + 2] = value;
        this.cache[cacheKey].values[i*4 + 3] = i < rawData.length ? 1.0 : 1.0;
      }
      console.log(cacheKey, this.cache[cacheKey]);
      return this.cache[cacheKey];
    });
  }
}
export default Track;
