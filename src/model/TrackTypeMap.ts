import { Strand } from "../../lib/gff3/Strand";
import { GeneClass } from "../../lib/sirius/AnnotationTileset";

export interface TrackTypeMap {
    'empty': {};
    'sequence': {};
    'annotation': {
        strand: Strand,
    };
}