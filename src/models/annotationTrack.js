
import Util from '../helpers/util.js';
import { Tile, TileCache, LinearCacheSampler, FixedCacheSampler } from './tileCache.js';
import { GENOME_LENGTH } from '../helpers/constants.js';

class AnnotationTrack {
  constructor(api, annotationIds) {
    this.api = api;
    this.annotationIds = annotationIds;
    this.loadData = this.loadData.bind(this);
    this.cache = new TileCache(0, GENOME_LENGTH, this.loadData, LinearCacheSampler(), FixedCacheSampler());
  }

  clearCache() {
    this.cache.clear();
  }

  get title() {
    return this.annotationIds.join(',');
  }

  getTiles(startBp, endBp, samplingRate, trackHeightPx) {
    return this.cache.get(startBp, endBp, samplingRate, trackHeightPx);
  }

  getAnnotations(start, end, samplingRate, trackHeightPx) {
    const tiles = this.getTiles(start, end, samplingRate, trackHeightPx);
    let ret = [];
    tiles.forEach(tile => {
      ret = ret.concat(tile.tile.data);
    });
    return ret;
  }

  loadData(start, end, samplingRate, trackHeightPx) {
    const promise = this.api.getAnnotationData(this.annotationIds, start, end, samplingRate, trackHeightPx);
    return promise.then(data => {
      const result = data.data;
      const rawData = data.data.values;
      return new Tile([start, end], [result.startBp, result.endBp], result.samplingRate, result.trackHeightPx, rawData);
    });
  }
}
export default AnnotationTrack;
