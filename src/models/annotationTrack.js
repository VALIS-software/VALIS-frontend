
import Util from '../helpers/util.js';
import { Tile, TileCache } from './tileCache.js';
import BaseTrack from './baseTrack.js';

const uuid = require('uuid/v1');

class AnnotationTrack extends BaseTrack {
  constructor(api, annotationIds) {
    super(api);
    this.annotationIds = annotationIds;
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
    const promise = this.api.getAnnotations(this.annotationIds, start, end, samplingRate, trackHeightPx);
    promise.then(data => {
      const result = data.data;
      const rawData = data.data.values;
      return new Tile([start, end], [result.startBp, result.endBp], result.samplingRate, result.trackHeightPx, rawData);
    });
  }
}
export default AnnotationTrack;
