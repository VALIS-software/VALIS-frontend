
import Util from '../helpers/util.js';
import { Tile, GraphCache } from '../helpers/cache.js';

import { 
  BASE_PAIR_COLORS,
  GENOME_LENGTH, 
  SIGNAL_COLORS,
  TRACK_DATA_TYPE_BASE_PAIRS, 
  TRACK_DATA_TYPE_GBANDS,
} from '../helpers/constants.js';
import Track, { TRACK_EVENT_LOADING } from './track.js';

const itree = require('interval-tree2');
const xspans = require('xspans');

const _ = require('underscore');

class GraphOverlay extends Track {
  constructor(api, graphId, annotationId1, annotationId2) {
    super();
    this.api = api;
    this.graphId = graphId;
    this.annotationId1 = annotationId1;
    this.annotationId2 = annotationId2;
    this.loadData = this.loadData.bind(this);
    this.cache = new GraphCache(0, GENOME_LENGTH, this.loadData);
  }

  get title() {
    return `${this.graphId}, ${this.annotationId1}->${this.annotationId2}`;
  }

  get showAxis() {
    return false;
  }

  getTooltipData(basePair, yOffset, startBp, endBp, samplingRate, trackHeightPx) {
    // TODO
    return null;
  }

  get min() {
    return null;
  }

  get max() {
    return null;
  }

  loadData(start, end, samplingRate, trackHeightPx) {
    this.notifyListeners(TRACK_EVENT_LOADING, true);
    const promise = this.api.getGraphData(this.graphId, this.annotationId1, this.annotationId2, start, end, samplingRate);
    return promise.then(data => {
      const result = data.data;
      const values = result.values;
      this.notifyListeners(TRACK_EVENT_LOADING, false);
      const tileData = { values };
      return new Tile([start, end], [start, end], result.samplingRate, 0, tileData);
    }, failure => {
      this.notifyListeners(TRACK_EVENT_LOADING, false);
    });
  }
}
export default GraphOverlay;
