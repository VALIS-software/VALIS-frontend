import { Tile, TileStore } from "./TileStore";
import axios from "../../../node_modules/axios";

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

    constructor(protected sourceId: string, tileSize: number = 1 << 15, protected macro: boolean = false) {
        super(tileSize, 1);
    }

    protected mapLodLevel(l: number) {
        return 0;
    }

    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload {
        console.log('Request', tile);

        let startBase = tile.x + 1;
        let endBase = startBase + tile.span;
        return axios.post(
            'http://35.185.230.75/query/full',
            {
                "type": "GenomeNode",
                "filters": {
                    "contig": "chr1", // @! should be source id / real contig
                    "type": "SNP",
                    // "source": "ExAC",
                    "start": { "$gte": startBase, "$lte": endBase }
                },
                "toEdges": [],
                "arithmetics": [],
                "limit": 30000
            }
        ).then((r) => {
            let variants: Array<VariantGenomeNode> = r.data.data;
            return variants.map((v) => { return {
                baseIndex: v.start - 1,
                refSequence: v.info.variant_ref,
                alts: v.info.allele_frequencies,
            } });
        });
    }

}

export class MacroVariantTileStore extends VariantTileStore {

    constructor(sourceId: string) {
        super(sourceId, 1 << 25, true);
    }

}

export default VariantTileStore;