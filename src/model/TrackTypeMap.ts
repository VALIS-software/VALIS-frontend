import { Strand } from "gff3/Strand";

export interface TrackTypeMap {
    'empty': {};
    'sequence': {};
    'annotation': {
        strand: Strand,
    };
    'variant': {
        query?: any
    },
}