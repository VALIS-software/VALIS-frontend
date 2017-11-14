

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
        // TODO: this code really needs explicit tests... we can get away with this for a demo
        // but the tiles should all divide up evenly! re-write this!
        const start = Math.floor(Math.max(tile, this.startBp));
        const end = Math.ceil(Math.min(this.endBp, tile + basePairsPerTile));

        if (start > end) return;

        const promise = this.api.getData(this.genomeId, this.trackId, start, end, samplingRateForRequest);

        const finalPromise = promise.then(data => {
          console.log('saved to cache: ', cacheKey);
          const rawData = data.data.values;
          this.cache[cacheKey] = new Float32Array(rawData.length);
          for (let i = 0; i < rawData; i++) {
            this.cache[cacheKey][i] = rawData[i];
          }
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
