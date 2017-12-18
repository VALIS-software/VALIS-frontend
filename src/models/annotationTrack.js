
import Util from '../helpers/util.js';
import { Tile, TileCache, LinearCacheSampler, FixedCacheSampler } from './tileCache.js';
import { GENOME_LENGTH } from '../helpers/constants.js';
import Track, { TRACK_EVENT_LOADING } from './track.js';

class AnnotationTrack extends Track { 
  constructor(api, annotationIds) {
    super();
    this.api = api;
    this.annotationIds = annotationIds;
    this.loadData = this.loadData.bind(this);
    this.cache = new TileCache(0, GENOME_LENGTH, this.loadData, LinearCacheSampler(), FixedCacheSampler(128));
  }

  get title() {
    return this.annotationIds.join(',');
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
    this.notifyListeners(TRACK_EVENT_LOADING, true);
    const promise = this.api.getAnnotationData(this.annotationIds, start, end, samplingRate, trackHeightPx);
    return promise.then(data => {
      const result = data.data;
      const rawData = data.data.values;
      this.notifyListeners(TRACK_EVENT_LOADING, false);
      return new Tile([start, end], [result.startBp, result.endBp], result.samplingRate, result.trackHeightPx, rawData);
    }, failure => {
      this.notifyListeners(TRACK_EVENT_LOADING, false);
    });
  }
}
export default AnnotationTrack;
