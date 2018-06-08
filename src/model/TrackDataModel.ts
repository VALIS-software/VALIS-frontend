/**
 * @! Temporary dummy model
 */
export enum TrackType {
    Empty = 'empty',
    Sequence = 'sequence',
    Annotation = 'annotation',
}

export type TrackDataModel = {
    sequenceId: string,
    name: string;
    type: TrackType;
}

export default TrackDataModel;