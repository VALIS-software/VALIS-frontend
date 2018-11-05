import { IntervalTrack, BlendMode, Tile } from "genome-visualizer";
import { IntervalTrackModelOverride } from "./IntervalTrackModelOverride";

/**
 * Override interval track to add a 'blendEnabled' flag
 */
export class IntervalTrackOverride extends IntervalTrack {

    constructor(model: IntervalTrackModelOverride) {
        super(model);
    }

    protected displayTileNode(tile: Tile<any>, z: number, x0: number, span: number, continuousLodLevel: number) {
        let node = super.displayTileNode(tile, z, x0, span, continuousLodLevel);

        if (this.model.blendEnabled === false) {
            node.opacity = 1;
            node.blendMode = BlendMode.NONE;
        }

        return node;
    }

}
