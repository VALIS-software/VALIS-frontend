
import Util from '../helpers/util.js';
import { Tile, TileCache, LinearCacheSampler, FixedCacheSampler } from '../helpers/cache.js';
import { GENOME_LENGTH } from '../helpers/constants.js';
import Track, { TRACK_EVENT_LOADING } from './track.js';

class AnnotationTrack extends Track { 
  constructor(api, annotationIds) {
    super();
    this.api = api;
    this.annotationIds = annotationIds;
    this.loadData = this.loadData.bind(this);
    this.cache = new TileCache(0, GENOME_LENGTH, this.loadData, LinearCacheSampler(), LinearCacheSampler(8, 8));
  }

  get title() {
    return this.annotationIds.join(',');
  }

  get showAxis() {
    return false;
  }

  hasAnnotation(annotationId) {
    return this.annotationIds.indexOf(annotationId) >= 0;
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
    this.notifyListeners(TRACK_EVENT_LOADING, true);
    let query = { query : [] };
    if (this.annotationIds[0] === 'GWASCatalog') {
      query = {
        query: [{
          GenomeNode : {
            filters : {
              type : 'variant',
              location: {
                startBp: start,
                endBp: end,
              },
              dataSource: 'GWASCatalog',
            },
          },
        },
        {
          EdgeNode: {
            filters : {
              type: 'influences',
              pvalue: { '<' : 0.5 },
              dataSource: '*',
            },
          },
        },
        {
          InfoNode : {
            filters : {
              type : 'trait',
              dataSource: '*',
              name: { contains : 'cancer' },
            },
          },
        }],
      };
    }
    const promise = this.api.getAnnotationData(this.annotationIds, start, end, samplingRate, trackHeightPx, query);
    return promise.then(data => {
      const result = data.data;
      const rawData = data.data.values;
      const totalCount = data.data.countInRange;
      this.notifyListeners(TRACK_EVENT_LOADING, false);
      return new Tile([start, end], [result.startBp, result.endBp], result.samplingRate, result.trackHeightPx, rawData, totalCount);
    }, failure => {
      this.notifyListeners(TRACK_EVENT_LOADING, false);
    });
  }
}
export default AnnotationTrack;
