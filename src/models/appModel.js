
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
const APP_EVENT_CLICK_TRACK_ELEMENT = 'CLICK_TRACK_ELEMENT';
const APP_EVENT_TRACK_VIEW_SETTINGS_UPDATED = 'TRACK_VIEW_SETTINGS_UPDATED';
const APP_EVENT_ADD_OVERLAY = 'ADD_OVERLAY';
const APP_EVENT_REMOVE_OVERLAY = 'REMOVE_OVERLAY';
const APP_EVENT_ADD_DATASET_BROWSER = 'ADD_DATASET_BROWSER';
const APP_EVENT_DATA_SET_SELECTED = 'DATA_SET_SELECTED';
const APP_EVENT_PUSH_VIEW = 'PUSH_VIEW';
const APP_EVENT_POP_VIEW = 'POP_VIEW';
const APP_EVENT_CLOSE_VIEW = 'CLOSE_VIEW';

export {
  APP_EVENT_ADD_TRACK,
  APP_EVENT_ADD_OVERLAY,
  APP_EVENT_REMOVE_OVERLAY,
  APP_EVENT_REMOVE_TRACK,
  APP_EVENT_REORDER_TRACKS,
  APP_EVENT_LOADING_STATE_CHANGED,
  APP_EVENT_CLICK_TRACK_ELEMENT,
  APP_EVENT_EDIT_TRACK_VIEW_SETTINGS,
  APP_EVENT_TRACK_VIEW_SETTINGS_UPDATED,
  APP_EVENT_DATA_SET_SELECTED,
  APP_EVENT_PUSH_VIEW,
  APP_EVENT_POP_VIEW,
  APP_EVENT_CLOSE_VIEW,
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

  pushView(title, info, elem) {
    this.notifyListeners(APP_EVENT_PUSH_VIEW, { title: title, info: info, view: elem });
  }

  popView() {
    this.notifyListeners(APP_EVENT_POP_VIEW);
  }

  closeView() {
    this.notifyListeners(APP_EVENT_CLOSE_VIEW);
  }

  editTrackViewSettings(viewGuid) {
    this.notifyListeners(APP_EVENT_EDIT_TRACK_VIEW_SETTINGS, viewGuid);
  }

  clickTrackElement(element) {
    this.notifyListeners(APP_EVENT_CLICK_TRACK_ELEMENT, element);
  }

  dataSetSelected(trackType) {
    this.notifyListeners(APP_EVENT_DATA_SET_SELECTED, trackType);
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

  addAnnotationTrack(annotationId, query=null) {
    return this.api.getAnnotation(annotationId, query).then(model => {
      const track = {
        guid: uuid(),
        height: 0.1,
        basePairOffset: 0,
        dataTrack: null,
        color: Math.sin(this.tracks.length * 0.1) / 2.0 + 0.5,
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
