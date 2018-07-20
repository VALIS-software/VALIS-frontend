import { Strand } from "gff3/Strand";
import TileStore from "./data-store/TileStore";

export interface TrackTypeMap {
    'empty': {};
    'sequence': {};
    'annotation': {
        strand: Strand,
    };
    'variant': {
        toEdges?: any
    },
    'interval': {
        tileStoreType: string,
        tileStoreConstructor: (contig: string) => TileStore<Float32Array, void>
    },
}