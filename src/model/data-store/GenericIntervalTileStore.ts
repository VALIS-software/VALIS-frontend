import { Tile, TileStore } from "./TileStore";
import { SiriusApi } from "sirius/SiriusApi";

export type TilePayload = Float32Array;

export default class GenericIntervalTileStore extends TileStore<TilePayload, void> {

    constructor(
        protected contig: string,
        protected query: any,
        protected resultTransform: (entry: any) => {
            startIndex: number,
            span: number
        },
        protected tileSize: number = 1 << 15,
    ) {
        super(
            tileSize, // tile size
            1
        );
    }

    protected mapLodLevel(l: number) {
        return l;
    }

    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload {
        /*
        let tileQuery = new QueryBuilder(this.query);
        // return SiriusApi.getQueryResults(this.query, true)
        .then((r) => {
            console.log('Query!', r.data);
            
            // allocate interval buffer
            let intervals = new Float32Array(r.data.length * 2);

            for (let i = 0; i < r.data.length; i++) {
                let entry = r.data[i];
                let {startIndex, span} = this.resultTransform(entry);
                intervals[i * 2 + 0] = startIndex;
                intervals[i * 2 + 1] = span;
            }

            return intervals;
        });
        */

        // generate some random intervals
        let nIntervals = 10;
        let intervals = new Float32Array(nIntervals * 2);

        for (let i = 0; i < nIntervals; i++) {
            let intervalStartIndex = Math.floor(Math.random() * tile.span + tile.x);
            let intervalSpan = Math.round(Math.random() * 1e6);

            intervals[i * 2 + 0] = intervalStartIndex;
            intervals[i * 2 + 1] = intervalSpan;
        }

        return intervals;
    }

}