/**
 * @! Temporary dummy model
 */
export enum TrackType {
    Empty = void 0,
    Sequence = 1,
}

export type TrackDataModel = {
    name: string;
    type: TrackType;
}

export default TrackDataModel;