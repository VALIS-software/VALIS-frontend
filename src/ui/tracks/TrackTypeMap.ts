import { TrackType } from "../../model/TrackDataModel";
import Track from "./Track";
import SequenceTrack from "./SequenceTrack";
import AnnotationTrack from "./AnnotationTrack";

export const trackTypeMap = {
    [TrackType.Empty]: Track,
    [TrackType.Sequence]: SequenceTrack,
    [TrackType.Annotation]: AnnotationTrack,
}

export default trackTypeMap;