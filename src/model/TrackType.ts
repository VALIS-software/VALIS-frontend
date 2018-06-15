import { TrackModel } from "./TrackModel";
import { AnnotationTrackModel } from "./AnnotationTrackModel";

export enum TrackType {
    Empty = 'empty',
    Sequence = 'sequence',
    Annotation = 'annotation'
}

export interface TrackTypeMap {
    [TrackType.Empty]: TrackModel;
    [TrackType.Sequence]: TrackModel;
    [TrackType.Annotation]: AnnotationTrackModel;
}