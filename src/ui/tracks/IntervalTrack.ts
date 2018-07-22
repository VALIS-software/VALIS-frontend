import UsageCache from "../../ds/UsageCache";
import GenericIntervalTileStore from "../../model/data-store/GenericIntervalTileStore";
import SharedTileStore from "../../model/data-store/SharedTileStores";
import { Tile, TileState } from "../../model/data-store/TileStore";
import { TrackModel } from "../../model/TrackModel";
import { Object2D } from "../core/Object2D";
import Track from "./Track";
import IntervalInstances, { IntervalInstance } from "./util/IntervalInstances";
import { Scalar } from "../../math/Scalar";

type TilePayload = Float32Array;

export default class IntervalTrack extends Track<'interval'> {

    protected tileStore: GenericIntervalTileStore;
    
    constructor(model: TrackModel<'interval'>) {
        super(model);
    }

    setContig(contig: string) {
        let typeKey = this.model.tileStoreType + ':' + JSON.stringify(this.model.query);
        this.tileStore = SharedTileStore.getTileStore(
            typeKey,
            contig,
            this.model.tileStoreConstructor
        );
        super.setContig(contig);
    }

    protected _pendingTiles = new UsageCache<Tile<any>>();
    protected _intervalTileCache = new UsageCache<IntervalInstances>();
    protected _onStage = new UsageCache<Object2D>();
    protected updateDisplay() {
        this._pendingTiles.markAllUnused();
        this._onStage.markAllUnused();

        const x0 = this.x0;
        const x1 = this.x1;
        const span = x1 - x0;
        const widthPx = this.getComputedWidth();

        if (widthPx > 0) {
            let basePairsPerDOMPixel = (span / widthPx);
            let continuousLodLevel = Scalar.log2(Math.max(basePairsPerDOMPixel, 1));

            this.tileStore.getTiles(x0, x1, basePairsPerDOMPixel, true, (tile) => {
                if (tile.state === TileState.Complete) {
                    this.displayTileNode(tile, 0.9, x0, span, continuousLodLevel);
                } else {
                    // if the tile is incomplete then wait until complete and call updateAnnotations() again
                    this._pendingTiles.get(this.contig + ':' + tile.key, () => this.createTileLoadingDependency(tile));

                    // display a fallback tile if one is loaded at this location
                    let gapCenterX = tile.x + tile.span * 0.5;
                    let fallbackTile = this.tileStore.getTile(gapCenterX, 1 << this.tileStore.macroLodLevel, false);

                    if (fallbackTile.state === TileState.Complete) {
                        // display fallback tile behind other tiles
                        this.displayTileNode(fallbackTile, 0.3, x0, span, continuousLodLevel);
                    }
                }
            });
        }

        this.displayNeedUpdate = false;
        this._pendingTiles.removeUnused(this.removeTileLoadingDependency);
        this._onStage.removeUnused(this.removeTile);
        this.toggleLoadingIndicator(this._pendingTiles.count > 0, true);
    }

    protected displayTileNode(tile: Tile<TilePayload>, z: number, x0: number, span: number, continuousLodLevel: number) {
        let tileKey = this.contig + ':' + z + ':' + tile.key;

        let node = this._intervalTileCache.get(tileKey, () => {
            return this.createTileNode(tile);
        });

        node.layoutParentX = (tile.x - x0) / span;
        node.layoutW = tile.span / span;
        node.z = z;

        // decrease opacity at large lods to prevent white-out as interval cluster together and overlap
        node.opacity = Scalar.lerp(1, 0.1, Scalar.clamp(continuousLodLevel / 15, 0, 1));
        node.transparent = node.opacity < 1; // try and display in opaque pass if we can

        this._onStage.get(tileKey, () => {
            this.add(node);
            return node;
        });
    }
    
    protected createTileNode(tile: Tile<TilePayload>) {
        let nIntervals = tile.payload.length * 0.5;

        let instanceData = new Array<IntervalInstance>(nIntervals);

        for (let i = 0; i < nIntervals; i++) {
            let intervalStartIndex = tile.payload[i * 2 + 0];
            let intervalSpan = tile.payload[i * 2 + 1];

            let fractionX = (intervalStartIndex - tile.x) / tile.span
            let wFractional = intervalSpan / tile.span;

            instanceData[i] = {
                xFractional: fractionX,
                wFractional: wFractional,
                y: 0,
                z: 0,
                h: 35,
                color: tile.lodLevel === 0 ? [0, 0, 1, 1.0] : [1, 0, 0, 1.0],
            };
        }

        let instancesTile = new IntervalInstances(instanceData);
        instancesTile.minWidth = 0.5;
        instancesTile.blendFactor = 0.2; // full additive
        instancesTile.y = 5;
        instancesTile.mask = this;

        return instancesTile;
    }

    protected removeTile = (tile: IntervalInstances) => {
        this.remove(tile);
    }

}