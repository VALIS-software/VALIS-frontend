import { Strand } from "../../lib/gff3/Strand";

export interface TrackTypeMap {
    ['empty']: {};
    ['sequence']: {};
    ['annotation']: {
        strand: Strand
    };
}