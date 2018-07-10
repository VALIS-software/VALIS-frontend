import Track from "./Track";
import { VariantTileStore } from "../../model/data-store/VariantTileStore";
import { TrackModel } from "../../model/TrackModel";
import { SharedTileStore } from "../../model/data-store/SharedTileStores";
import UsageCache from "../../ds/UsageCache";
import { Tile } from "../../model/data-store/TileStore";

export class VariantTrack extends Track<'variant'> {

    protected variantTileStore: VariantTileStore;

    constructor(model: TrackModel<'variant'>) {
        super(model);

        this.variantTileStore = SharedTileStore.variant[model.sequenceId];
    }

    protected updateDisplay() {
        this._pendingTiles.markAllUnused();

        // fetch and display data

        this.displayNeedUpdate = false;
        this._pendingTiles.removeUnused(this.deleteTileLoadingDependency);
        this.toggleLoadingIndicator(this._pendingTiles.count > 0, true);
    }

}

export default VariantTrack;