import SiriusApi, { Feature } from "../../lib/sirius/SiriusApi";
import { Tile, TileStore } from "./TileStore";

export type TilePayload = Array<Feature>;

export type BlockPayload = {};

export class AnnotationStore extends TileStore<TilePayload, BlockPayload> {

    constructor(sourceId: string) {
        super(1 << 20, 1);
    }

    protected mapLodLevel(l: number) {
        return 0;
    }

    protected getTilePayload(tile: Tile<TilePayload>) {
        console.log('Request annotations for ', tile.lodX, tile.lodSpan);
        return SiriusApi.loadAnnotations('chromosome1', tile.lodX, tile.lodSpan);
    }

}

export default AnnotationStore;