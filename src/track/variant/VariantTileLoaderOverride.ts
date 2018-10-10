import { VariantTileLoader, VariantTilePayload, Tile } from "genome-browser";
import { SiriusApi } from "valis";

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

export class VariantTileLoaderOverride extends VariantTileLoader {

    protected getTilePayload(tile: Tile<VariantTilePayload>): Promise<VariantTilePayload> | VariantTilePayload {
        const startBase = tile.x + 1;
        const endBase = startBase + tile.span;
        const snpQuery = this.model.query;
        let ApiPromise;
        if (!snpQuery) {
            // use special API created for the "all variants track"
            ApiPromise = SiriusApi.getAllVariantTrackData(this.contig, startBase, endBase);
        } else {
            ApiPromise = SiriusApi.getVariantTrackData(this.contig, startBase, endBase, snpQuery);
        }
        // use general API to load other variants, the number of results should be no more than 10M.
        return ApiPromise.then((data) => {
            let variants: Array<VariantGenomeNode> = data.data;
            return variants.map((v) => { return {
                id: v.id,
                baseIndex: v.start - 1,
                refSequence: v.info.variant_ref ? v.info.variant_ref: '',
                alts: v.info.variant_alt ? v.info.variant_alt.split(','): [],
            } });
        });
    }

}