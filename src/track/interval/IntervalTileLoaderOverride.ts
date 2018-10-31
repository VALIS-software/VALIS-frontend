import { IntervalTileLoader, Tile, IDataSource } from "genome-browser";
import { SiriusApi } from "valis";
import { IntervalTrackModelOverride } from "./IntervalTrackModelOverride";

export class IntervalTileLoaderOverride extends IntervalTileLoader {

    static cacheKey(model: IntervalTrackModelOverride): string {
        return JSON.stringify(model.query);
    }

    constructor(
        protected readonly dataSource: IDataSource,
        protected readonly model: IntervalTrackModelOverride,
        protected readonly contig: string,
    ) {
        super(dataSource, model, contig);
    }

    protected getTilePayload(tile: Tile<Float32Array>): Promise<Float32Array> | Float32Array {
        // @! quality improvement; reduce perception of shivering when zooming in
        // if lod level = 0 and a macro track exists that covers this tile then we can filter that tile to get the lod 0 tile (so no network request or promise)

        let startBase = tile.x + 1;
        let endBase = startBase + tile.span;

        return SiriusApi.getIntervalTrackData(this.contig, startBase, endBase, this.model.query).then((r) => {
            // allocate interval buffer
            let intervals = new Float32Array(r.data.length * 2);

            for (let i = 0; i < r.data.length; i++) {
                let entry = r.data[i];
                intervals[i * 2 + 0] = entry.start - 1;
                intervals[i * 2 + 1] = entry.length;
            }
            return intervals;
        });
    }

}