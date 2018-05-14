
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
    const ranges = Util.splitRangeToChromosomeRanges(start, end);
    console.log(ranges);
    this.notifyListeners(TRACK_EVENT_LOADING, true);

    // fetch data for each chromosome individually
    const fetchRanges = ranges.map(range => {
      return this.api.getAnnotationData(this.annotationId, 
        range.contig, 
        range.start, 
        range.end, 
        samplingRate, 
        trackHeightPx, 
        this.query
      ).then(result => { range: range, data: result });
    });

    this.notifyListeners(TRACK_EVENT_LOADING, true);
    let totalCount = 0;
    let rawData = [];
    let startBp = null;
    let endBp = null;
    return Promise.all(fetchRanges).then(results => {
      results.forEach(contigResult => {
        const data = contigResult.data;
        const range = contigResult.range;
        const contigStart = CHROMOSOME_START_BASE_PAIRS[Util.chromosomeNameToIndex(range.contig)];
        const result = data.data;
        // convert contig coordinate back to global coordinate
        data.data.values.forEach(r => {
          r.startBp += contigStart;
          r.endBp += contigStart;
        });
        const currStartBp = result.startBp + contigStart;
        const currEndBp = result.endBp + contigStart;
        startBp = startBp === null ? currStartBp : Math.min(startBp, currStartBp);
        endBp = endBp === null ? currEndBp : Math.max(endBp, currEndBp);
        rawData = rawData.concat(data.data.values);
        totalCount += data.data.countInRange;
      });
      return new Tile([start, end], [startBp, endBp], samplingRate, trackHeightPx, rawData, totalCount);
    }, failure => {
      this.notifyListeners(TRACK_EVENT_LOADING, false);
    });
  }
}
export default AnnotationTrack;
