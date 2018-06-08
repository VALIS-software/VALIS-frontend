/**
 * @! temporary design
 */
import { TrackType } from "./TrackDataModel";
import TileStore from "./TileStore";
import { SequenceTileStore } from "./SequenceTileStore";
import { AnnotationStore } from "./AnnotationStore";

type StringMap<T> = { [key: string]: T };

export const SharedTileStore: {
    [TrackType.Sequence]: StringMap<SequenceTileStore>,
    [TrackType.Annotation]: StringMap<AnnotationStore>,
} = {
    [TrackType.Sequence]: {},
    [TrackType.Annotation]: {},
}

export default SharedTileStore;