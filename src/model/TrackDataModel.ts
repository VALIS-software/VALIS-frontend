/**
 * @! Temporary dummy model
 */
export enum TrackType {
    Empty = undefined,
    Sequence = 1,
}

export type TrackDataModel = {
    name: string;
    type: TrackType;
}

export default TrackDataModel;