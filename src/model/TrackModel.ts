/**
 * @! Temporary dummy model
 * 
 * Should be plain-old-data and easy to serialize
 * - Should encapsulate complete state, excluding transitive UI state
 * - Applying a TrackModel state should restore state exactly
 */

export type TrackModel = {
    sequenceId: string,
    name: string;
    type: string;
}

export default TrackModel;