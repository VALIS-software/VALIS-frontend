import { TrackType, TrackTypeMap } from "../../model/TrackType";
import AnnotationTrack from "./AnnotationTrack";
import SequenceTrack from "./SequenceTrack";
import Track from "./Track";

export const TrackClassMap: {
    [key: string]: typeof Track
} = {
    [TrackType.Empty]: Track,
    [TrackType.Sequence]: SequenceTrack,
    [TrackType.Annotation]: AnnotationTrack,
}

export default TrackClassMap;