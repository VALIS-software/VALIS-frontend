import { TrackModel } from "./TrackModel";
import { Strand } from "../../lib/gff3/Strand";

export type AnnotationTrackModel = TrackModel & {   
    strand: Strand;
}