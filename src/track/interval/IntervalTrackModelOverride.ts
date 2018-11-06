import { IntervalTrackModel } from "genome-visualizer";

export type IntervalTrackModelOverride = IntervalTrackModel & {
    readonly query: any,
    readonly blendEnabled: boolean,
    readonly displayCount: boolean,
    readonly maxCount: number,
}