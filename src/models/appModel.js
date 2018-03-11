
import GenomeAPI from './api.js';
import EventCreator from './eventCreator.js';
import { TRACK_EVENT_LOADING } from './track.js';

const uuid = require('uuid/v4');
const _ = require('underscore');

const APP_EVENT_ADD_TRACK = 'ADD_TRACK';
const APP_EVENT_REMOVE_TRACK = 'REMOVE_TRACK';
const APP_EVENT_REORDER_TRACKS = 'REORDER_TRACKS';
const APP_EVENT_LOADING_STATE_CHANGED = 'LOADING_CHANGED';
const APP_EVENT_EDIT_TRACK_VIEW_SETTINGS = 'EDIT_TRACK_VIEW';
const APP_EVENT_SHOW_ENTITY_DETAIL = 'SHOW_ENTITY_DETAIL';
const APP_EVENT_TRACK_VIEW_SETTINGS_UPDATED = 'TRACK_VIEW_SETTINGS_UPDATED';
const APP_EVENT_ADD_OVERLAY = 'ADD_OVERLAY';
const APP_EVENT_REMOVE_OVERLAY = 'REMOVE_OVERLAY';
const APP_EVENT_ADD_DATASET_BROWSER = 'ADD_DATASET_BROWSER';

export { 
  APP_EVENT_ADD_TRACK,
  APP_EVENT_ADD_OVERLAY,
  APP_EVENT_REMOVE_OVERLAY,
  APP_EVENT_REMOVE_TRACK,
  APP_EVENT_REORDER_TRACKS,
  APP_EVENT_LOADING_STATE_CHANGED,
  APP_EVENT_SHOW_ENTITY_DETAIL,
  APP_EVENT_EDIT_TRACK_VIEW_SETTINGS,
  APP_EVENT_TRACK_VIEW_SETTINGS_UPDATED,
  APP_EVENT_ADD_DATASET_BROWSER,
};

class AppModel extends EventCreator {
  constructor() {
    super();
    this.api = new GenomeAPI();
    this.addDataTrack = this.addDataTrack.bind(this);
    this.addAnnotationTrack = this.addAnnotationTrack.bind(this);
    this.addGraphOverlay = this.addGraphOverlay.bind(this);
    this.removeTrack = this.removeTrack.bind(this);
    this.tracks = [];
    this.overlays = [];
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

  editTrackViewSettings(viewGuid) {
    this.notifyListeners(APP_EVENT_EDIT_TRACK_VIEW_SETTINGS, viewGuid);
  }

  showEntityDetails(element) {
    this.notifyListeners(APP_EVENT_SHOW_ENTITY_DETAIL, element);
  }

  addDatasetBrowser() {
    return this.api.getTrackInfo().then(data => {
      this.notifyListeners(APP_EVENT_ADD_DATASET_BROWSER, data);  
      return data;
    });
  }

  addDataTrack(trackId) {
    return this.api.getTrack(trackId).then(model => {
      const track = {
        guid: uuid(),
        height: 0.1,
        basePairOffset: 0,
        dataTrack: model,
        color: null,
        annotationTrack: null,
      };
      model.addListener(this.loadingStarted, TRACK_EVENT_LOADING);
      this.tracks = this.tracks.concat([track]);
      this.notifyListeners(APP_EVENT_ADD_TRACK, track);
      return track;
    });
  }

  addAnnotationTrack(annotationId) {
    return this.api.getAnnotation([annotationId]).then(model => {
      const track = {
        guid: uuid(),
        height: 0.1,
        basePairOffset: 0,
        dataTrack: null,
        color: 0.6,
        annotationTrack: model,
      };
      model.addListener(this.loadingStarted, TRACK_EVENT_LOADING);
      this.tracks = this.tracks.concat([track]);
      this.notifyListeners(APP_EVENT_ADD_TRACK, track);
      return track;
    });
  }

  addGraphOverlay(graphId, annotationId1, annotationId2) {
    return this.api.getGraph(graphId, annotationId1, annotationId2).then(model => {
      model.addListener(this.loadingStarted, TRACK_EVENT_LOADING);
      const overlay = {
        guid: uuid(),
        graphTrack: model,
      };
      this.overlays = this.overlays.concat([overlay]);
      this.notifyListeners(APP_EVENT_ADD_OVERLAY, overlay);
      return overlay;
    });
  }

  indexOfTrack(trackViewGuid) {
    const index = _.findIndex(this.tracks, (item) => {
      return item.guid === trackViewGuid;
    });
    return index;
  }

  moveTrack(trackViewGuid, toIdx) {
    const arr = this.tracks.slice();
    const index = this.indexOfTrack(trackViewGuid);
    const trackMoved = arr[index];
    arr.splice(toIdx, 0, arr.splice(index, 1)[0]);
    this.tracks = arr;
    this.notifyListeners(APP_EVENT_REORDER_TRACKS, trackMoved);
  }

  setTrackColor(trackViewGuid, color) {
    const index = this.indexOfTrack(trackViewGuid);
    this.tracks[index].color = color;
    this.notifyListeners(APP_EVENT_TRACK_VIEW_SETTINGS_UPDATED, this.tracks[index]);
  }

  getTrackColor(trackViewGuid) {
    const index = this.indexOfTrack(trackViewGuid);
    return this.tracks[index].color;
  }

  setTrackHeight(trackViewGuid, height) {
    const index = this.indexOfTrack(trackViewGuid);
    this.tracks[index].height = height;
    this.notifyListeners(APP_EVENT_TRACK_VIEW_SETTINGS_UPDATED, this.tracks[index]);
  }

  getTrackHeight(trackViewGuid) {
    const index = this.indexOfTrack(trackViewGuid);
    return this.tracks[index].height;
  }

  getTrackBasePairOffset(trackViewGuid) {
    const index = this.indexOfTrack(trackViewGuid);
    return this.tracks[index].basePairOffset;
  }

  setTrackBasePairOffset(trackViewGuid, bpOffset) {
    const index = this.indexOfTrack(trackViewGuid);
    this.tracks[index].basePairOffset = bpOffset;
    this.notifyListeners(APP_EVENT_TRACK_VIEW_SETTINGS_UPDATED, this.tracks[index]);
  }

  removeTrack(trackViewGuid) {
    const arr = this.tracks.slice();
    const index = _.findIndex(arr, (item) => {
      return item.guid === trackViewGuid;
    });

    // TODO: modify this if we have both data & annotation track
    const removed = arr[index].dataTrack || arr[index].annotationTrack;
    removed.removeListener(this.loadingStarted);
    if (index >= 0) {
      arr.splice(index, 1); 
      this.tracks = arr;
      this.notifyListeners(APP_EVENT_REMOVE_TRACK, removed);
    }
  }
}

export default AppModel;
