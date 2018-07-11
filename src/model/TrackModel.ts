import { TrackTypeMap } from "./TrackTypeMap";

/**
 * Should be plain-old-data and easy to serialize
 * - Should encapsulate complete state, excluding transitive UI state
 * - Applying a TrackModel state should restore state exactly
 */

export type TrackModel<TrackType extends keyof TrackTypeMap = keyof TrackTypeMap> = 
    {
        type: TrackType;
        sequenceId: string;
        name: string;
    } & TrackTypeMap[TrackType]

export default TrackModel;