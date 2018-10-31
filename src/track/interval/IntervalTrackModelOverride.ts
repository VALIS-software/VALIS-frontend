import { IntervalTrackModel } from "genome-browser";

export type IntervalTrackModelOverride = IntervalTrackModel & {
    readonly query: any,
    readonly blendEnabled: boolean,
}