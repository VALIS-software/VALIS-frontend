
import EventCreator from './eventCreator.js';

export default class Track extends EventCreator {
  clearCache() {
    this.cache.clear();
  }

  getTiles(startBp, endBp, samplingRate, trackHeightPx) {
    return this.cache.get(startBp, endBp, samplingRate, trackHeightPx);
  }
}

const TRACK_EVENT_LOADING = 'TRACK_LOADING';

export { 
  TRACK_EVENT_LOADING,
};

