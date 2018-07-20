import { TrackModel } from "../../model/TrackModel";
import AnnotationTrack from "./AnnotationTrack";
import SequenceTrack from "./SequenceTrack";
import Track from "./Track";
import { VariantTrack } from "./VariantTrack";
import IntervalTrack from "./IntervalTrack";

export function ConstructTrack(model: TrackModel) {
    switch (model.type) {
        case 'empty': return new Track(model);
        case 'sequence': return new SequenceTrack(model as TrackModel<'sequence'>);
        case 'annotation': return new AnnotationTrack(model as TrackModel<'annotation'>);
        case 'variant': return new VariantTrack(model as TrackModel<'variant'>);
        case 'interval': return new IntervalTrack(model as TrackModel<'interval'>);
        default: {
            console.error(`Not able to construct a "${model.type}" track`);
            return null;
        }
    }
}

export default ConstructTrack;