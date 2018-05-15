import { Track } from "../Track";
import TrackRow from "../TrackRow";
import { Scalar } from "../../math/Scalar";
import TileCache from "./TileCache";

export class SequenceTrack extends Track {

    static tileCache = new TileCache<Uint8Array>();

    // protected activeAxisPointerColor = [1, 0.8, 0.8, 1];
    // protected secondaryAxisPointerColor = [1, 0.3, 0.3, 1];

    constructor(track: TrackRow) {
        super(track);
        this.color.set([0,0,0,1]);
    }

    setRange(x0: number, x1: number) {
        super.setRange(x0, x1);
        this.updateTiles();
    }

    applyTreeTransforms(root?: boolean) {
        this.updateTiles();
        super.applyTreeTransforms(root);
    }

    private _lastComputedWidth: number;
    private _lastX0: number;
    private _lastX1: number;
    protected updateTiles() {
        const widthPx = this.getComputedWidth();
        const x0 = this.x0;
        const x1 = this.x1;
        const range = x1 - x0;

        let widthChanged = this._lastComputedWidth !== widthPx;
        let rangeChanged = this._lastX0 !== x0 || this._lastX1 !== x1;

        if (!widthChanged && !rangeChanged) {
            return;
        }

        this._lastX0 = x0;
        this._lastX1 = x1;
        this._lastComputedWidth = widthPx;

        let basePairsPerPixel = range / widthPx;
        let samplingDensity = basePairsPerPixel;

        let lodLevelFractional = Scalar.log2(Math.max(samplingDensity, 1));
        let lodLevelFloor = Math.floor(lodLevelFractional);

        // @! need to account for change -> data is not exactly as requested
        // lodStartBaseIndex = Math.floor(lodStartBaseIndex);
        // lodNBases = Math.ceil(lodNBases);
        /*

        (x0, x1, density)

        // Primary Data
        {
            // get data to cover range
            let tileDataset = TileEngine.getTiles(x0, x1, density) -> Array<{
                id,
                coveringRange: [fx0, fw]
                array, texture // data and texture may be empty initially but load in later
            }>

            // make sure we've got at least 'tileData.length' tileNodes available
            // remove unused nodes
            let tileNodes = ...

            // toolTip values are handled by the tileNode
            tileNode.addInteractionListener('pointermove', (e) => {
                // update tooltop
            });

            for (data in tileDataSet) {
                tileNode.x = data.fx0;
                tileNode.layoutW = data.fw;
                tileNode.setArray(data.array);
                tileNode.setTexture(data.texture);

                // fade in tile node after data arrives
                // make tile node capture pointer events when data is available
            }

        }

        // Fallback Data
        {
            // get the best data we have available in cache to cover the range
            // should be z-indexed _behind_ primary data
            // if no data is available skip the tile
            // if we prefetch a high lod then we will always have something to display
            // when zooming in, as soon as a lod threshold is crossed primary data should be returned as fallback data
            // fallback tiles handled _exactly_ like primary tiles execpt their z-indexed
            // this means they also set the tooltip values

            let fallbackTileDataset = TileEngine.getTilesFromCache(x0, x1, density) -> ...
        }
        */
    }

}

export default SequenceTrack;