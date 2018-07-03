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
    TrackMixPanel
}

let apiBaseUrl = '';

if (process != null && process.env != null) {
    if (process.env.API_URL != null) {
        // url override set
        apiBaseUrl = process.env.API_URL;
    } else {
        // use default dev url
        apiBaseUrl = process.env.dev ? LOCAL_API_URL : '';
    }
}

export default class AppModel extends EventCreator {

    api: any = new GenomeAPI(apiBaseUrl);

    private tracks: any[] = [];
    private overlays: any[] = [];
    private tracksLoading: number = 0;

    public getTracks = () => {
        return this.tracks;
    };

    public updateLoadingState = (wasLoading: boolean) => {
        const isLoading = this.tracksLoading > 0;
        if (wasLoading !== isLoading) {
            this.notifyListeners(AppEvent.LoadingStateChanged, isLoading);
        }
    }

    public pushLoading = () => {
        const wasLoading = this.tracksLoading > 0;
        this.tracksLoading++;
        this.updateLoadingState(wasLoading);
    }

    public popLoading = () => {
        const wasLoading = this.tracksLoading > 0;
        this.tracksLoading--;
        this.updateLoadingState(wasLoading);
    }

    public loadingStarted = (event: any) => {
        if (event.data === true) {
            this.pushLoading();
        } else {
            this.popLoading();
        }
    };

    public addDataTrack = (trackId: any) => {
        // @! todo addDataTrack
        console.warn(`@! refactor todo addDataTrack`);
    };

    public addAnnotationTrack = (annotationId: any, query: any = null, filters: any = null) => {
        // @! todo addAnnotationTrack
        console.warn(`@! refactor todo addAnnotationTrack`);
    };

    public addGraphOverlay = (
        graphId: any,
        annotationId1: any,
        annotationId2: any
    ) => {
        // @! todo addGraphOverlay
        console.warn(`@! refactor todo addGraphOverlay`);
    };

    public trackMixPanel = (msg: string, details: any = {}) => {
        this.notifyListeners(AppEvent.TrackMixPanel, { msg, details });
    }

    public error = (source: object, errorMsg: object) => {
        this.notifyListeners(AppEvent.Failure, {
            sender: source,
            error: errorMsg,
        });
    }

    public indexOfTrack = (trackViewGuid: any) => {
        // @! refactor todo
        console.warn(`@! refactor todo`);
        // const index = _.findIndex(this.tracks, (item: any) => {
            // return item.guid === trackViewGuid;
        // });
        // return index;
    };

    public moveTrack = (trackViewGuid: any, toIdx: any) => {
        // @! refactor todo
        console.warn(`@! refactor todo`);
        /*
        const arr = this.tracks.slice();
        const index = this.indexOfTrack(trackViewGuid);
        const trackMoved = arr[index];
        arr.splice(toIdx, 0, arr.splice(index, 1)[0]);
        this.tracks = arr;
        this.notifyListeners(AppEvent.ReorderTracks, trackMoved);
        */
    };

    public setTrackFilter = (trackViewGuid: any, filter: any) => {
        // const index = this.indexOfTrack(trackViewGuid);
        // this.api.getAnnotation('', Util.applyFilterToQuery(this.tracks[index].query, filter)).then((model: any) => {
        //   // remove listener from old track:
        //   this.tracks[index].annotationTrack.removeListener(this.loadingStarted);
        //   this.tracks[index].annotationTrack = model;
        //   model.addListener(this.loadingStarted, TRACK_EVENT_LOADING);
        // }, (err: object) => {
        //   this.notifyListeners(AppEvent.Failure, err);
        // });
    }

    public getTrackFilter = (trackViewGuid: any) => {
        // @! refactor
        console.warn('@! refactor todo', trackViewGuid);
        /*
        const index = this.indexOfTrack(trackViewGuid);
        return this.tracks[index].filter;
        */
    }

    public getTrackQuery = (trackViewGuid: any) => {
        // @! refactor
        console.warn('@! refactor todo');
        /*
        const index = this.indexOfTrack(trackViewGuid);
        return this.tracks[index].query;
        */
    }

    public setTrackColor = (trackViewGuid: any, color: any) => {
        // @! refactor todo
        console.warn(`@! refactor todo`);
        /*
        const index = this.indexOfTrack(trackViewGuid);
        this.tracks[index].color = color;
        this.notifyListeners(AppEvent.TrackViewSettingsUpdated, this.tracks[index]);
        */
    };

    public getTrackColor = (trackViewGuid: any) => {
        // @! refactor todo
        console.warn(`@! refactor todo`);
        /*
        const index = this.indexOfTrack(trackViewGuid);
        return this.tracks[index].color;
        */
    };

    public setTrackHeight = (trackViewGuid: any, height: any) => {
        // @! refactor todo
        console.warn(`@! refactor todo`);
        /*
        const index = this.indexOfTrack(trackViewGuid);
        this.tracks[index].height = height;
        this.notifyListeners(AppEvent.TrackViewSettingsUpdated, this.tracks[index]);
        */
    };

    public getTrackHeight = (trackViewGuid: any) => {
        // @! refactor todo
        /*
        console.warn(`@! refactor todo`);
        const index = this.indexOfTrack(trackViewGuid);
        return this.tracks[index].height;
        */
    };

    public getTrackBasePairOffset = (trackViewGuid: any) => {
        // @! refactor todo
        console.warn(`@! refactor todo`);
        /*
        const index = this.indexOfTrack(trackViewGuid);
        return this.tracks[index].basePairOffset;
        */
    };

    public setTrackBasePairOffset = (trackViewGuid: any, bpOffset: any) => {
        // @! refactor todo
        console.warn(`@! refactor todo`);
        /*
        const index = this.indexOfTrack(trackViewGuid);
        this.tracks[index].basePairOffset = bpOffset;
        this.notifyListeners(AppEvent.TrackViewSettingsUpdated, this.tracks[index]);
        */
    };

    public removeTrack = (trackViewGuid: any) => {
        // @! todo removeTrack
        console.warn(`@! refactor todo removeTrack`);
    };

}