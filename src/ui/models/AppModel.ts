import GenomeAPI from "./api.js";
import EventCreator from "./eventCreator.js";
import { LOCAL_API_URL } from "../helpers/constants";

export enum AppEvent {
    AddTrack,
    AddOverlay,
    RemoveOverlay,
    RemoveTrack,
    ReorderTracks,
    LoadingStateChanged,
    TrackViewSettingsUpdated,
    Failure,
}

const apiBaseUrl = process.env.API_URL || (process.env.dev ? LOCAL_API_URL : false) || '';

export default class AppModel extends EventCreator {

    api: any = new GenomeAPI(apiBaseUrl);

    private tracks: any[] = [];
    private overlays: any[] = [];
    private tracksLoading: number = 0;

    public getTracks = () => {
        return this.tracks;
    };

    public addDataTrack = (trackId: any) => {
        throw `@! refactor todo addDataTrack`;
    };

    public addAnnotationTrack = (annotationId: any, query: any = null) => {
        throw `@! refactor todo addAnnotationTrack`;
    };

    public addGraphOverlay = (
        graphId: any,
        annotationId1: any,
        annotationId2: any
    ) => {
        throw `@! refactor todo addGraphOverlay`;
    };

    error = (source: object, errorMsg: object) => {
        this.notifyListeners(AppEvent.Failure, {
            sender: source,
            error: errorMsg,
        });
    }

    public indexOfTrack = (trackViewGuid: any) => {
        throw `@! refactor todo`;
        // const index = _.findIndex(this.tracks, (item: any) => {
            // return item.guid === trackViewGuid;
        // });
        // return index;
    };

    public moveTrack = (trackViewGuid: any, toIdx: any) => {
        throw `@! refactor todo`;
        const arr = this.tracks.slice();
        const index = this.indexOfTrack(trackViewGuid);
        const trackMoved = arr[index];
        arr.splice(toIdx, 0, arr.splice(index, 1)[0]);
        this.tracks = arr;
        this.notifyListeners(AppEvent.ReorderTracks, trackMoved);
    };

    public setTrackColor = (trackViewGuid: any, color: any) => {
        throw `@! refactor todo`;
        const index = this.indexOfTrack(trackViewGuid);
        this.tracks[index].color = color;
        this.notifyListeners(AppEvent.TrackViewSettingsUpdated, this.tracks[index]);
    };

    public getTrackColor = (trackViewGuid: any) => {
        throw `@! refactor todo`;
        const index = this.indexOfTrack(trackViewGuid);
        return this.tracks[index].color;
    };

    public setTrackHeight = (trackViewGuid: any, height: any) => {
        throw `@! refactor todo`;
        const index = this.indexOfTrack(trackViewGuid);
        this.tracks[index].height = height;
        this.notifyListeners(AppEvent.TrackViewSettingsUpdated, this.tracks[index]);
    };

    public getTrackHeight = (trackViewGuid: any) => {
        throw `@! refactor todo`;
        const index = this.indexOfTrack(trackViewGuid);
        return this.tracks[index].height;
    };

    public getTrackBasePairOffset = (trackViewGuid: any) => {
        throw `@! refactor todo`;
        const index = this.indexOfTrack(trackViewGuid);
        return this.tracks[index].basePairOffset;
    };

    public setTrackBasePairOffset = (trackViewGuid: any, bpOffset: any) => {
        throw `@! refactor todo`;
        const index = this.indexOfTrack(trackViewGuid);
        this.tracks[index].basePairOffset = bpOffset;
        this.notifyListeners(AppEvent.TrackViewSettingsUpdated, this.tracks[index]);
    };

    public removeTrack = (trackViewGuid: any) => {
        throw `@! refactor todo removeTrack`;
    };

}
