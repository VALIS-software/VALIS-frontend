

// WebGL requires min 4096 size for float textures. This could be smaller
// but we'd need to copy tiles into a single large texture.
const CACHE_TILE_SIZE = 1024;
const CACHE_SAMPLING_STEP_SIZE = 32;

function floorToMultiple(x, k) {
  return (x % k === 0) ? x :  x + k - x % k - k;
}

function ceilToMultiple(x, k) {
  return (x % k === 0) ? x :  x + k - x % k;
}

class Track {
  constructor(api, genomeId, trackId, startBp, endBp) {
    this.api = api;
    this.genomeId = genomeId;
    this.trackId = trackId;
    this.startBp = startBp;
    this.endBp = endBp;
    this.cache = {}; // TODO: use a real cache here!
  }

  getTileSize() {
    return CACHE_TILE_SIZE;
  }

  loadData(startBp, endBp, samplingRate) {
    const samplingRateForRequest = floorToMultiple(samplingRate, CACHE_SAMPLING_STEP_SIZE);
    const basePairsPerTile = CACHE_TILE_SIZE * samplingRateForRequest;
    const startCacheBp = floorToMultiple(startBp, basePairsPerTile);
    const endCacheBp = ceilToMultiple(endBp, basePairsPerTile);

    const promises = [];

    // make a list of tiles 
    const tiles = [];
    for (let i = startCacheBp; i <= endBp; i+= basePairsPerTile) {
      tiles.push(i);
    }

    tiles.forEach(tile => {
      // TODO: you can downsample existing cached data but for now the samplingRateForRequest must match!
      const cacheKey = `${tile}_${samplingRateForRequest}`;
      if (this.cache[cacheKey] !== undefined) {
        // pull from cache
        promises.push(new Promise((resolve, reject) => {
          resolve(this.cache[cacheKey]);
        }));
      } else {
        // TODO: this code really needs explicit tests... 
        // probably some off-by-one errors in this 
        // the tiles should all divide up evenly! re-write this!
        const start = Math.floor(Math.max(tile, this.startBp));
        const end = Math.ceil(Math.min(this.endBp, tile + basePairsPerTile));

        if (start > end) return;

        const promise = this.api.getData(this.genomeId, this.trackId, start, end, samplingRateForRequest);

        const finalPromise = promise.then(data => {
          console.log('saved to cache: ', cacheKey, data.data);
          const rawData = data.data.values.slice(0, CACHE_TILE_SIZE);
          this.cache[cacheKey] = {
            startBp: data.data.startBp,
            endBp: data.data.endBp,
            samplingRate: data.data.samplingRate,
          };
          this.cache[cacheKey].values = new Float32Array(4*CACHE_TILE_SIZE);
          this.cache[cacheKey].values.set(rawData);
          return this.cache[cacheKey];
        });
        promises.push(finalPromise);
      }
    });
    return {
      promises: promises,
      startBp: startCacheBp,
      endBp: endCacheBp,
      samplingRate: samplingRateForRequest,
    };
  }
}
export default Track;
