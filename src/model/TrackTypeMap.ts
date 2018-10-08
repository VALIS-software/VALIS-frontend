import Strand from "genomics-formats/dist/gff3/Strand";

export interface TrackTypeMap {
    'empty': {};
    'sequence': {};
    'annotation': {
        strand: Strand,
    };
    'variant': {
        query?: any
    },
    'interval': {
        query: any,
        tileStoreType: string,
        blendEnabled: boolean,
    },
}