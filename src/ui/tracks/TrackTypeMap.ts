import { TrackType } from "../../model/TrackDataModel";
import AnnotationTrack from "./AnnotationTrack";
import SequenceTrack from "./SequenceTrack";
import Track from "./Track";

export const trackTypeMap = {
    [TrackType.Empty]: Track,
    [TrackType.Sequence]: SequenceTrack,
    [TrackType.Annotation]: AnnotationTrack,
}

export default trackTypeMap;