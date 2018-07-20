import { Tile, TileStore } from "./TileStore";

export type TilePayload = Float32Array;

export default class EncodeRegulatoryTileStore extends TileStore<TilePayload, void> {

    constructor(protected contig: string) {
        super(
            1 << 25, // tile size
            1
        );
    }

    protected mapLodLevel(l: number) {
        return 0;
    }

    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload {
        return new Float32Array([]);
    }

}