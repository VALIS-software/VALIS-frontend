import { Tile, TileStore } from "./TileStore";
import QueryBuilder from "sirius/QueryBuilder";
import SiriusApi from "sirius/SiriusApi";
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
        const builder = new QueryBuilder();
        builder.newGenomeQuery();
        builder.filterType('SNP');
        builder.filterContig(this.contig);
        builder.filterStartBp({'>=': startBase, '<=': endBase});
        if (this.model.toEdges) {
            this.model.toEdges.forEach((e: any) => {
                builder.addToEdge(e);
            });
        }
        builder.setLimit(1000000);
        const snpQuery = builder.build();
        return SiriusApi.getQueryResults(snpQuery, true).then((r) => {
            let variants: Array<VariantGenomeNode> = r.data.data;

            return variants.map((v) => { return {
                baseIndex: v.start - 1,
                refSequence: v.info.variant_ref,
                alts: v.info.allele_frequencies,
            } });
        });
    }

}
export default VariantTileStore;