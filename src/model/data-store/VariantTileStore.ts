import { Tile, TileStore } from "./TileStore";
import axios from "../../../node_modules/axios";
import { TrackModel } from "../TrackModel";

// Tile payload is a list of genes extended with nesting
type VariantGenomeNode = {
    contig: string,
    type: string,
    start: number,
    end: number,
    source: Array<string>,
    name: string,
    info: VariantInfo,
    id: string
};

type VariantInfo = {
    flags: Array<string>,
    RSPOS: number,
    dbSNPBuildID: number,
    SSR: number,
    SAO: number,
    VP: string,
    WGT: number,
    VC: string,
    TOPMED: string,
    variant_ref: string,
    variant_alt: string,
    filter: string,
    qual: string,
    allele_frequencies: { [key: string]: number },
    variant_tags: Array<string>,
    variant_affected_genes: Array<string>
}

export type TilePayload = Array<{
    baseIndex: number,
    refSequence: string,
    alts: { [sequence: string]: number }
}>;

export class VariantTileStore extends TileStore<TilePayload, void> {

    constructor(protected model: TrackModel<'variant'>, protected contig: string, tileSize: number = 1 << 15, protected macro: boolean = false) {
        super(tileSize, 1);
    }

    protected mapLodLevel(l: number) {
        return 0;
    }

    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload {

        if (this.model.toEdges) {// @!
            console.log('Request', tile, this.model);
        }

        let startBase = tile.x + 1;
        let endBase = startBase + tile.span;
        return axios.post(
            'http://35.185.230.75/query/full',
            {
                "type": "GenomeNode",
                "filters": {
                    "contig": this.contig,
                    "type": "SNP",
                    "start": { "$gte": startBase, "$lte": endBase }
                },
                "toEdges": this.model.toEdges ? this.model.toEdges : [],
                "arithmetics": [],
                "limit": 3000000
            }
        ).then((r) => {
            let variants: Array<VariantGenomeNode> = r.data.data;

            if (this.model.toEdges != null) { // @!
                console.log(variants.length);
            }

            return variants.map((v) => { return {
                baseIndex: v.start - 1,
                refSequence: v.info.variant_ref,
                alts: v.info.allele_frequencies,
            } });
        });
    }

}

// export class MacroVariantTileStore extends VariantTileStore {

//     constructor(sourceId: string) {
//         super(sourceId, 1 << 25, true);
//     }

// }

export default VariantTileStore;