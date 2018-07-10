import { Tile, TileStore } from "./TileStore";

// Tile payload is a list of genes extended with nesting

export type TilePayload = {};

export class VariantTileStore extends TileStore<TilePayload, void> {

    constructor(protected sourceId: string, tileSize: number = 1 << 20, protected macro: boolean = false) {
        super(tileSize, 1);
    }

    protected mapLodLevel(l: number) {
        return 0;
    }

    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload {
        console.log('Request', tile);
        return null;
    }

}

export class MacroVariantTileStore extends VariantTileStore {

    constructor(sourceId: string) {
        super(sourceId, 1 << 25, true);
    }

}

export default VariantTileStore;