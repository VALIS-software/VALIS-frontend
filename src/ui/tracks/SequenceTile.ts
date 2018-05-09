import { TrackTile } from "../TrackTile";
import Track from "../Track";

export class SequenceTile extends TrackTile {

    // protected activeAxisPointerColor = [1, 0.8, 0.8, 1];
    // protected secondaryAxisPointerColor = [1, 0.3, 0.3, 1];

    constructor(track: Track) {
        super(track);
        this.color.set([0,0,0,1]);
    }

}

export default SequenceTile;