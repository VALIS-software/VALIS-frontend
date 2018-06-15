/**
 * @! temporary design
 */
import { AnnotationTileStore } from "./AnnotationTileStore";
import { SequenceTileStore } from "./SequenceTileStore";
import { TrackType } from "../TrackType";

type StringMap<T> = { [id: string]: T };

export const SharedTileStore: {
    [TrackType.Sequence]: StringMap<SequenceTileStore>,
    [TrackType.Annotation]: StringMap<AnnotationTileStore>,
} = {
    [TrackType.Sequence]: {},
    [TrackType.Annotation]: {},
}

export default SharedTileStore;