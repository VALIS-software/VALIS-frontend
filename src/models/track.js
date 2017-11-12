

const CACHE_TILE_SIZE_BP = 1048576;

function floorToMultiple(x, k) {
  return (x % k === 0) ? x :  x + k - x % k - k;
}

function ceilToMultiple(x, k) {
  return (x % k === 0) ? x :  x + k - x % k;
}

class TrackDataFuture {
  constructor(startBp, endBp, sampleRate, promises) {
    this.loaded = 0;
    this.toLoad = promises.length;
    this.sampleRate = sampleRate;
    this.startBp = startBp;
    this.endBp = endBp;
    this.dataValues = new Float32Array(endBp - startBp);
    this.dataValues.fill(0.0);

    promises.forEach(promise => {
      promise.then(data => {
        this.setData(data.startBp, data.endBp, data.values);
      });
    });
  }

  range() {
    return [this.startBp, this.endBp];
  }

  setData(startBp, endBp, values) {
    console.log('got data', values);
    for (let i = startBp; i <= endBp; i += this.sampleRate) {
      this.dataValues[i] = values[i - startBp];
    }
    this.loaded++;
  }

  loading() {
    return this.loaded === this.promises.length;
  }

  data() {
    return this.dataValues;
  }
}

class Track {
  constructor(api, genomeId, trackId) {
    this.api = api;
    this.genomeId = genomeId;
    this.trackId = trackId;
    this.cache = {};
  }

  loadData(startBp, endBp, samplingRate) {
    console.log('hello there');
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
      if (this.cache[tile] !== undefined && this.cache[tile].samplingRate === samplingRateForRequest) {
        // pull from cache
        promises.push(new Promise((resolve, reject) => {
          resolve(this.cache[tile]);
        }));
      } else {
        console.log('fetching data', tile);
        // fetch via API, store in cache then send to future
        const promise = this.api.getData(this.genomeId, this.trackId, tile, tile + CACHE_TILE_SIZE_BP, samplingRateForRequest);

        const finalPromise = promise.then(data => {
          this.cache[tile] = data.data;
          return data.data;
        });
        promises.push(finalPromise);
      }
    });
    return new TrackDataFuture(startCacheKey, endCacheKey, samplingRateForRequest, promises);
  }
}
export default Track;
