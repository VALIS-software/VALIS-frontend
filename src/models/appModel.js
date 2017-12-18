
import GenomeAPI from './api.js';
import EventCreator from './eventCreator.js';
import { TRACK_EVENT_LOADING } from './track.js';

const uuid = require('uuid/v4');
const _ = require('underscore');

const APP_EVENT_ADD_TRACK = 'ADD_TRACK';
const APP_EVENT_REMOVE_TRACK = 'REMOVE_TRACK';
const APP_EVENT_REORDER_TRACKS = 'REORDER_TRACKS';
const APP_EVENT_LOADING_STATE_CHANGED = 'LOADING_CHANGED';

export { 
  APP_EVENT_ADD_TRACK,
  APP_EVENT_REMOVE_TRACK,
  APP_EVENT_REORDER_TRACKS,
  APP_EVENT_LOADING_STATE_CHANGED,
};

class AppModel extends EventCreator {
  constructor() {
    super();
    this.api = new GenomeAPI();
    this.addDataTrack = this.addDataTrack.bind(this);
    this.addAnnotationTrack = this.addAnnotationTrack.bind(this);
    this.removeTrack = this.removeTrack.bind(this);
    this.tracks = [];
    this.tracksLoading = 0;
    this.loadingStarted = this.loadingStarted.bind(this);
  }

  getTracks() {
    return this.tracks;
  }

  loadingStarted(event) {
    const wasLoading = this.tracksLoading > 0;
    if (event.data === true) {
      this.tracksLoading++;
    } else {
      this.tracksLoading--;
    }
    const isLoading = this.tracksLoading > 0;
    if (wasLoading !== isLoading) {
      this.notifyListeners(APP_EVENT_LOADING_STATE_CHANGED, isLoading);
    }
  }

  addAnnotationTrack(annotationId) {
    this.api.getAnnotation([annotationId]).then(model => {
      const track = {
        guid: uuid(),
        dataTrack: null,
        annotationTrack: model,
      };
      model.addListener(this.loadingStarted, TRACK_EVENT_LOADING);
      this.tracks = this.tracks.concat([track]);
      this.notifyListeners(APP_EVENT_ADD_TRACK, track);
    });
  }

  indexOfTrack(trackGuid) {
    const index = _.findIndex(this.tracks, (item) => {
      return item.guid === trackGuid;
    });
    return index;
  }

  moveTrack(trackGuid, toIdx) {
    const arr = this.tracks.slice();
    const index = this.indexOfTrack(trackGuid);
    const trackMoved = arr[index];
    arr.splice(toIdx, 0, arr.splice(index, 1)[0]);
    this.tracks = arr;
    this.notifyListeners(APP_EVENT_REORDER_TRACKS, trackMoved);
  }

  addDataTrack(trackId) {
    this.api.getTrack(trackId).then(model => {
      const track = {
        guid: uuid(),
        dataTrack: model,
        annotationTrack: null,
      };
      model.addListener(this.loadingStarted, TRACK_EVENT_LOADING);
      this.tracks = this.tracks.concat([track]);
      this.notifyListeners(APP_EVENT_ADD_TRACK, track);
    });
  }

  removeTrack(trackGuid) {
    const arr = this.tracks.slice();
    const index = _.findIndex(arr, (item) => {
      return item.guid === trackGuid;
    });

    const removed = arr[index];
    removed.removeListener(this.loadingStarted);
    if (index >= 0) {
      arr.splice(index, 1); 
      this.tracks = arr;
      this.notifyListeners(APP_EVENT_REMOVE_TRACK, removed);
    }
  }
}

export default AppModel;
