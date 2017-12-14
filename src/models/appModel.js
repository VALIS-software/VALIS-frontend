
import GenomeAPI from './api.js';

const uuid = require('uuid/v4');
const _ = require('underscore');

const APP_EVENT_ADD_TRACK = 'ADD_TRACK';
const APP_EVENT_REMOVE_TRACK = 'REMOVE_TRACK';
const APP_EVENT_REORDER_TRACKS = 'REORDER_TRACKS';

class AppModel {
  constructor() {
    this.api = new GenomeAPI();
    this.addDataTrack = this.addDataTrack.bind(this);
    this.addAnnotationTrack = this.addAnnotationTrack.bind(this);
    this.removeTrack = this.removeTrack.bind(this);
    this.tracks = [];
    this.listeners = new Set();
  }

  addListener(listener) {
    this.listeners.add(listener);
  }

  removeListener(listener) {
    this.listeners.delete(listener);
  }

  getTracks() {
    return this.tracks;
  }

  notifyListeners(eventType, data) {
    this.listeners.forEach(evtTarget => {
      evtTarget({
        tracks: this.tracks,
        eventType: eventType,
        eventData: data,
      });
    });
  }

  addAnnotationTrack(annotationId) {
    this.api.getAnnotation([annotationId]).then(model => {
      const track = {
        guid: uuid(),
        dataTrack: null,
        annotationTrack: model,
      };
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

    if (index >= 0) {
      arr.splice(index, 1); 
      this.tracks = arr;
      this.notifyListeners(APP_EVENT_REMOVE_TRACK, removed);
    }
  }
}

export { 
  APP_EVENT_ADD_TRACK,
  APP_EVENT_REMOVE_TRACK,
  APP_EVENT_REORDER_TRACKS,
};

export default AppModel;
