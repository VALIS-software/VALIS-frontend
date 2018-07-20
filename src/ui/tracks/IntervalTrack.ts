import Track from "./Track";
import { TrackModel } from "../../model/TrackModel";
import TileStore, { Tile } from "../../model/data-store/TileStore";
import SharedTileStore from "../../model/data-store/SharedTileStores";
import UsageCache from "../../ds/UsageCache";

type TilePayload = Float32Array;

export default class IntervalTrack extends Track<'interval'> {

    protected tileStore: TileStore<TilePayload, void>;
    
    constructor(model: TrackModel<'interval'>) {
        super(model);
    }

    setContig(contig: string) {
        this.tileStore = SharedTileStore.getTileStore(
            this.model.tileStoreType,
            contig,
            this.model.tileStoreConstructor
        )
        super.setContig(contig);
    }

    protected _pendingTiles = new UsageCache<Tile<any>>();
    protected updateDisplay() {
        this._pendingTiles.markAllUnused();

        // fetch and display data

        this.displayNeedUpdate = false;
        this._pendingTiles.removeUnused(this.removeTileLoadingDependency);
        this.toggleLoadingIndicator(this._pendingTiles.count > 0, true);
    }

}