import { TrackModel } from "../../model/TrackModel";
import AnnotationTrack from "./AnnotationTrack";
import SequenceTrack from "./SequenceTrack";
import Track from "./Track";
import { VariantTrack } from "./VariantTrack";

export function ConstructTrack(model: TrackModel) {
    switch (model.type) {
        case 'empty': return new Track(model);
        case 'sequence': return new SequenceTrack(model as TrackModel<'sequence'>);
        case 'annotation': return new AnnotationTrack(model as TrackModel<'annotation'>);
        case 'variant': return new VariantTrack(model as TrackModel<'variant'>);
    }
}

export default ConstructTrack;