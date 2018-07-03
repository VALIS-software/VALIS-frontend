import { TileStore } from "./TileStore";
import { AnnotationTileStore } from "./AnnotationTileStore";
import { SequenceTileStore } from "./SequenceTileStore";

type StringMap<T> = { [id: string]: T };

export const SharedTileStore = {
    empty: {} as StringMap<TileStore<any, any>>,
    sequence: {} as StringMap<SequenceTileStore>,
    annotation: {} as StringMap<AnnotationTileStore>,
    macroAnnotation: {} as StringMap<AnnotationTileStore>,
}

export default SharedTileStore;