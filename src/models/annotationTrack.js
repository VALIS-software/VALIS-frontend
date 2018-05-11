
import Util from '../helpers/util.js';
import { Tile, TileCache, LinearCacheSampler, FixedCacheSampler } from '../helpers/cache.js';
import { GENOME_LENGTH, CHROMOSOME_START_BASE_PAIRS } from '../helpers/constants.js';
import Track, { TRACK_EVENT_LOADING } from './track.js';

class AnnotationTrack extends Track {
  constructor(api, annotationId, query=null) {
    super();
    this.api = api;
    this.annotationId = annotationId;
    this.query = query;
    this.loadData = this.loadData.bind(this);
    this.cache = new TileCache(0, GENOME_LENGTH, this.loadData, LinearCacheSampler(), LinearCacheSampler(8, 8));
  }

  get title() {
    return this.annotationId;
  }

  get showAxis() {
    return false;
  }

  hasAnnotation(annotationId) {
    return this.annotationId === annotationId;
  }

  getAnnotations(start, end, samplingRate, trackHeightPx) {
    const tiles = this.getTiles(start, end, samplingRate, trackHeightPx);
    let ret = [];
    let countInRange = 0;
    tiles.forEach(tile => {
      if (tile.tile) {
        countInRange += tile.tile.count;
        ret = ret.concat(tile.tile.data);
      }
    });
    return {
      annotations: ret,
      countInRange: countInRange,
    };
  }

  loadData(start, end, samplingRate, trackHeightPx) {
    // Translate to chromosome centric coordinate:
    const range = Util.chromosomeRelativeRange(start, end);
    const contig = 'chr' + Util.chromosomeIndexToName(range.chromosomeIndex);
    const contigStart = CHROMOSOME_START_BASE_PAIRS[range.chromosomeIndex];

    this.notifyListeners(TRACK_EVENT_LOADING, true);
    const promise = this.api.getAnnotationData(this.annotationId, contig, range.start, range.end, samplingRate, trackHeightPx, this.query);
    return promise.then(data => {
      const result = data.data;
      const rawData = data.data.values;
      const totalCount = data.data.countInRange;
      this.notifyListeners(TRACK_EVENT_LOADING, false);
      // convert contig coordinate back to global coordinate
      rawData.forEach(r => {
        r.startBp += contigStart;
        r.endBp += contigStart;
      });
      const startBp = result.startBp + contigStart;
      const endBp = result.endBp + contigStart;
      return new Tile([start, end], [startBp, endBp], result.samplingRate, result.trackHeightPx, rawData, totalCount);
    }, failure => {
      this.notifyListeners(TRACK_EVENT_LOADING, false);
    });
  }
}
export default AnnotationTrack;
