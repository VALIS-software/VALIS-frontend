

const CACHE_TILE_SIZE_BP = 1048576;

function floorToMultiple(x, k) {
  return (x % k === 0) ? x :  x + k - x % k - k;
}

function ceilToMultiple(x, k) {
  return (x % k === 0) ? x :  x + k - x % k;
}

class Track {
  constructor(api, genomeId, trackId) {
    this.api = api;
    this.genomeId = genomeId;
    this.trackId = trackId;
    this.cache = {}; // TODO: use a real cache here!
  }


  loadData(startBp, endBp, samplingRate) {
    const samplingRateForRequest = floorToMultiple(samplingRate, 2);
    const startCacheKey = floorToMultiple(startBp, CACHE_TILE_SIZE_BP);
    const endCacheKey = ceilToMultiple(endBp, CACHE_TILE_SIZE_BP);

    const promises = [];

    // make a list of tiles 
    const tiles = [];
    for (let i = startCacheKey; i <= endCacheKey; i+= CACHE_TILE_SIZE_BP) {
      tiles.push(i);
    }

    tiles.forEach(tile => {
      // TODO: you can downsample existing cached data but for now the samplingRateForRequests must match!
      const cacheKey = `${tile}_${samplingRateForRequest}`;
      if (this.cache[cacheKey] !== undefined) {
        // pull from cache
        promises.push(new Promise((resolve, reject) => {
          resolve(this.cache[cacheKey]);
        }));
      } else {
        // fetch via API, store in cache then send to future
        const promise = this.api.getData(this.genomeId, this.trackId, tile, tile + CACHE_TILE_SIZE_BP, samplingRateForRequest);

        const finalPromise = promise.then(data => {
          const rawData = data.data.values;
          this.cache[cacheKey] = new Float32Array(rawData.length);
          for(let i = 0; i < rawData; i++) {
            this.cache[cacheKey][i] = rawData[i];
          }
          return this.cache[cacheKey];
        });
        promises.push(finalPromise);
      }
    });
    return Promise.all(promises);
  }
}
export default Track;
