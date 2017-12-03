
import Util from '../helpers/util.js';
import { Tile, TileCache } from './tileCache.js';
import { GENOME_LENGTH } from '../helpers/constants.js';

class BaseTrack {
  constructor(api) {
    this.api = api;
    this.cache = new TileCache(0, GENOME_LENGTH, (start, end, samplingRate, trackHeightPx) => {
      return this.loadData(start, end, samplingRate, trackHeightPx);
    });
  }

  clearCache() {
    this.cache.clear();
  }

  getTiles(startBp, endBp, samplingRate, trackHeightPx) {
    return this.cache.get(startBp, endBp, samplingRate, trackHeightPx);
  }

  loadData() {
    console.log('wtf');
    return true;
  }
}
export default BaseTrack;
