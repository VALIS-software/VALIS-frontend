import { SharedTileStore } from "../../model/data-store/SharedTileStores";
import { VariantTileStore } from "../../model/data-store/VariantTileStore";
import { TrackModel } from "../../model/TrackModel";
import Track from "./Track";
import Scalar from "../../math/Scalar";

export class VariantTrack extends Track<'variant'> {

    protected readonly macroLodBlendRange = 2;
    protected readonly macroLodThresholdLow = 10;
    protected readonly macroLodThresholdHigh = this.macroLodThresholdLow + this.macroLodBlendRange;

    protected tileStore: VariantTileStore;

    constructor(model: TrackModel<'variant'>) {
        super(model);

        this.tileStore = SharedTileStore.variant[model.sequenceId];
    }

    protected updateDisplay() {
        this._pendingTiles.markAllUnused();

        const x0 = this.x0;
        const x1 = this.x1;
        const span = x1 - x0;
        const widthPx = this.getComputedWidth();
        if (widthPx > 0) {
            
            let basePairsPerDOMPixel = (span / widthPx);
            let continuousLodLevel = Scalar.log2(Math.max(basePairsPerDOMPixel, 1));

            let macroOpacity: number = Scalar.linstep(this.macroLodThresholdLow, this.macroLodThresholdHigh, continuousLodLevel);
            let microOpacity: number = 1.0 - macroOpacity;

            // micro-scale details
            if (microOpacity > 0) {
                this.tileStore.getTiles(x0, x1, basePairsPerDOMPixel, true, (tile) => {
                });
            }

        }

        this._pendingTiles.removeUnused(this.deleteTileLoadingDependency);
        this.toggleLoadingIndicator(this._pendingTiles.count > 0, true);
        this.displayNeedUpdate = false;
    }

}

export default VariantTrack;