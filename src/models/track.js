const _ = require('underscore');

// WebGL requires min 4096 size for float textures. This could be smaller
// but we'd need to copy tiles into a single large texture.
const CACHE_TILE_SIZE = 1024;
const CACHE_SAMPLING_STEP_SIZE = 32;

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
    const needToFetch = [];
    for (let i = startCacheBp; i <= endBp; i+= basePairsPerTile) {
      const cacheKey = `${i}_${samplingRateForRequest}`;
      if (this.cache[cacheKey] === undefined && !this.inFlight[cacheKey]) {
        needToFetch.push(i);
        this.inFlight[cacheKey] = true;
      } else {
        tiles.push(this.cache[cacheKey]);  
      }
    }
    this.loadData(needToFetch, samplingRateForRequest);
    return tiles;
  }

  loadData(tiles, samplingRateForRequest) {
    const promises = [];
    const basePairsPerTile = CACHE_TILE_SIZE * samplingRateForRequest;
    tiles.forEach(tile => {
      // TODO: you can downsample existing cached data but for now the samplingRateForRequest must match!
      const cacheKey = `${tile}_${samplingRateForRequest}`;
      if (this.cache[cacheKey] !== undefined) {
        // pull from cache
        promises.push(new Promise((resolve, reject) => {
          resolve(this.cache[cacheKey]);
        }));
      } else {
        const start = Math.floor(Math.max(tile, this.startBp));
        const end = Math.ceil(Math.min(this.endBp, tile + basePairsPerTile));

        if (start > end) return;

        const promise = this.api.getData(this.genomeId, this.trackId, start, end, Math.round(samplingRateForRequest));

        const finalPromise = promise.then(data => {
          const rawData = data.data.values.slice(0, CACHE_TILE_SIZE);
          this.cache[cacheKey] = {
            startBp: data.data.startBp,
            endBp: data.data.endBp,
            samplingRate: data.data.samplingRate,
          };
          // HACK (should not have to use RGBA textures)
          this.cache[cacheKey].values = new Float32Array(CACHE_TILE_SIZE*4);
          for (let i = 0; i < CACHE_TILE_SIZE; i++) {
            this.cache[cacheKey].values[i*4] = rawData[i];  
          }
          
          return this.cache[cacheKey];
        });
        promises.push(finalPromise);
      }
    });
  }
}
export default Track;
