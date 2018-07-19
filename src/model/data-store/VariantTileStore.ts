import { SiriusApi } from "sirius/SiriusApi";
import { TrackModel } from "../TrackModel";
import { Tile, TileStore } from "./TileStore";

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
    id: string,
    baseIndex: number,
    refSequence: string,
    alts: { [sequence: string]: number }
}>;

export class VariantTileStore extends TileStore<TilePayload, void> {

    constructor(protected model: TrackModel<'variant'>, protected contig: string) {
        super(
            1 << 15, // tile size
            1
        );
    }

    protected mapLodLevel(l: number) {
        if (this.model.toEdges == null) {
            return 0;
        }

        return Math.floor(l / 10) * 10;
    }

    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload {
        let startBase = tile.x + 1;
        let endBase = startBase + tile.span;
        return SiriusApi.getQueryResults({
            "type": "GenomeNode",
            "filters": {
                "contig": this.contig,
                "type": "SNP",
                "start": { "$gte": startBase, "$lte": endBase }
            },
            "toEdges": this.model.toEdges ? this.model.toEdges : [],
            "arithmetics": [],
            "limit": 3000000
        }, true).then((r) => {
            let variants: Array<VariantGenomeNode> = r.data;

            return variants.map((v) => {
                return {
                    id: v.id,
                    baseIndex: v.start - 1,
                    refSequence: v.info.variant_ref,
                    alts: v.info.allele_frequencies,
                }
            });
        });
    }

}
export default VariantTileStore;