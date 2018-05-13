import GenomeAPI from "./api.js";
import EventCreator from "./eventCreator.js";
import { TRACK_EVENT_LOADING } from "./track.js";

const uuid = require("uuid/v4");
const _ = require("underscore");

export enum AppEvent {
  AddTrack,
  AddOverlay,
  RemoveOverlay,
  RemoveTrack,
  ReorderTracks,
  LoadingStateChanged,
  TrackViewSettingsUpdated
}

export default class AppModel extends EventCreator {
  private api: any = new GenomeAPI();
  private tracks: any[] = [];
  private overlays: any[] = [];
  private tracksLoading: number = 0;

  public getTracks = () => {
    return this.tracks;
  };

  public loadingStarted = (event: any) => {
    const wasLoading = this.tracksLoading > 0;
    if (event.data === true) {
      this.tracksLoading++;
    } else {
      this.tracksLoading--;
    }
    const isLoading = this.tracksLoading > 0;
    if (wasLoading !== isLoading) {
      this.notifyListeners(AppEvent.LoadingStateChanged, isLoading);
    }
  };

  public addDataTrack = (trackId: any) => {
    return this.api.getTrack(trackId).then((model: any) => {
      const track: object = {
        guid: uuid(),
        height: 0.1,
        basePairOffset: 0,
        dataTrack: model,
        color: null,
        annotationTrack: null
      };
      model.addListener(this.loadingStarted, TRACK_EVENT_LOADING);
      this.tracks = this.tracks.concat([track]);
      this.notifyListeners(AppEvent.AddTrack, track);
      return track;
    });
  };

  public addAnnotationTrack = (annotationId: any, query: any = null) => {
    return this.api.getAnnotation(annotationId, query).then((model: any) => {
      const track: object = {
        guid: uuid(),
        height: 0.1,
        basePairOffset: 0,
        dataTrack: null,
        color: Math.sin(this.tracks.length * 0.1) / 2.0 + 0.5,
        annotationTrack: model
      };
      model.addListener(this.loadingStarted, TRACK_EVENT_LOADING);
      this.tracks = this.tracks.concat([track]);
      this.notifyListeners(AppEvent.AddTrack, track);
      return track;
    });
  };

  public addGraphOverlay = (
    graphId: any,
    annotationId1: any,
    annotationId2: any
  ) => {
    return this.api
      .getGraph(graphId, annotationId1, annotationId2)
      .then((model: any) => {
        model.addListener(this.loadingStarted, TRACK_EVENT_LOADING);
        const overlay = {
          guid: uuid(),
          graphTrack: model
        };
        this.overlays = this.overlays.concat([overlay]);
        this.notifyListeners(AppEvent.AddOverlay, overlay);
        return overlay;
      });
  };

  public indexOfTrack = (trackViewGuid: any) => {
    const index = _.findIndex(this.tracks, (item: any) => {
      return item.guid === trackViewGuid;
    });
    return index;
  };

  public moveTrack = (trackViewGuid: any, toIdx: any) => {
    const arr = this.tracks.slice();
    const index = this.indexOfTrack(trackViewGuid);
    const trackMoved = arr[index];
    arr.splice(toIdx, 0, arr.splice(index, 1)[0]);
    this.tracks = arr;
    this.notifyListeners(AppEvent.ReorderTracks, trackMoved);
  };

  public setTrackColor = (trackViewGuid: any, color: any) => {
    const index = this.indexOfTrack(trackViewGuid);
    this.tracks[index].color = color;
    this.notifyListeners(AppEvent.TrackViewSettingsUpdated, this.tracks[index]);
  };

  public getTrackColor = (trackViewGuid: any) => {
    const index = this.indexOfTrack(trackViewGuid);
    return this.tracks[index].color;
  };

  public setTrackHeight = (trackViewGuid: any, height: any) => {
    const index = this.indexOfTrack(trackViewGuid);
    this.tracks[index].height = height;
    this.notifyListeners(AppEvent.TrackViewSettingsUpdated, this.tracks[index]);
  };

  public getTrackHeight = (trackViewGuid: any) => {
    const index = this.indexOfTrack(trackViewGuid);
    return this.tracks[index].height;
  };

  public getTrackBasePairOffset = (trackViewGuid: any) => {
    const index = this.indexOfTrack(trackViewGuid);
    return this.tracks[index].basePairOffset;
  };

  public setTrackBasePairOffset = (trackViewGuid: any, bpOffset: any) => {
    const index = this.indexOfTrack(trackViewGuid);
    this.tracks[index].basePairOffset = bpOffset;
    this.notifyListeners(AppEvent.TrackViewSettingsUpdated, this.tracks[index]);
  };

  public removeTrack = (trackViewGuid: any) => {
    const arr = this.tracks.slice();
    const index = _.findIndex(arr, (item: any) => {
      return item.guid === trackViewGuid;
    });

    // TODO: modify this if we have both data & annotation track
    const removed = arr[index].dataTrack || arr[index].annotationTrack;
    removed.removeListener(this.loadingStarted);
    if (index >= 0) {
      arr.splice(index, 1);
      this.tracks = arr;
      this.notifyListeners(AppEvent.RemoveTrack, removed);
    }
  };
}
