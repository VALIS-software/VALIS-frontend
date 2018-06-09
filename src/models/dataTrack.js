import Util from "../helpers/util.js";
import { Tile, TileCache } from "../helpers/cache.js";
import {
  BASE_PAIR_COLORS,
  GENOME_LENGTH,
  SIGNAL_COLORS,
  TRACK_DATA_TYPE_BASE_PAIRS,
  TRACK_DATA_TYPE_GBANDS,
} from "../helpers/constants.js";
import Track, { TRACK_EVENT_LOADING } from "./track.js";

const _ = require("underscore");

class DataTrack extends Track {
  constructor(api, trackId) {
    super();
    this.api = api;
    this.trackId = trackId;
    this.loadData = this.loadData.bind(this);
    this.cache = new TileCache(0, GENOME_LENGTH, this.loadData);
    this._min = null;
    this._max = null;
    this.aggregations =
      trackId === "sequence" ? ["none"] : ["max", "mean", "median", "min"];
  }

  get title() {
    return this.trackId;
  }

  get showAxis() {
    return this.trackId !== "sequence";
  }

  getTooltipData(
    basePair,
    yOffset,
    startBp,
    endBp,
    samplingRate,
    trackHeightPx
  ) {
    if (basePair < startBp || basePair > endBp) {
      return null;
    }

    const tiles = this.getTiles(startBp, endBp, samplingRate, trackHeightPx);

    // find the basePair in the tiles:
    let ret = {
      value: null,
      valueNormalized: null
    };
    tiles.forEach(tile => {
      if (basePair >= tile.range[0] && basePair <= tile.range[1]) {
        const totalRange = tile.tile.tileRange[1] - tile.tile.tileRange[0];
        const idx = Math.round(
          this.cache.tileSize *
          ((basePair - tile.tile.tileRange[0]) / totalRange)
        );
        const values = tile.tile.data.values;
        const dimensions = tile.tile.data.dimensions;
        const curr = [];
        const currNormalized = [];
        let colors = SIGNAL_COLORS;
        if (tile.tile.data.dataType === TRACK_DATA_TYPE_BASE_PAIRS) {
          const currValue = values[4 * idx];
          if (currValue <= 0.0) {
            curr.push("A");
            colors = [BASE_PAIR_COLORS[0]];
          } else if (currValue <= 0.25) {
            curr.push("T");
            colors = [BASE_PAIR_COLORS[1]];
          } else if (currValue <= 0.5) {
            curr.push("C");
            colors = [BASE_PAIR_COLORS[2]];
          } else if (currValue <= 0.75) {
            curr.push("G");
            colors = [BASE_PAIR_COLORS[3]];
          }
          currNormalized.push(0.5);
        } else if (tile.tile.data.dataType === TRACK_DATA_TYPE_GBANDS) {
          const d = values[idx];
          colors = [Util.multiplyColor([255, 255, 255], d)];
          curr.push(d);
          currNormalized.push(0.5);
        } else {
          for (let i = 0; i < dimensions.length; i++) {
            const d = values[dimensions.length * idx + i];
            curr.push(d);
            currNormalized.push((d - this.min) / (this.max - this.min));
          }
        }
        ret = {
          values: curr,
          dimensions: dimensions,
          valuesNormalized: currNormalized,
          positionNormalized: _.max(currNormalized),
          colors: colors
        };
      }
    });
    return ret;
  }

  get min() {
    return this._min;
  }

  get max() {
    return this._max;
  }

  loadData(start, end, samplingRate, trackHeightPx) {
    // Translate to chromosome centric coordinate:
    const ranges = Util.splitRangeToChromosomeRanges(start, end);

    this.notifyListeners(TRACK_EVENT_LOADING, true);

    // fetch data for each chromosome individually
    const fetchRanges = ranges.map(range => {
      return this.api.getData(
        this.trackId,
        range.contig,
        range.start,
        range.end,
        samplingRate,
        trackHeightPx,
        this.aggregations
      );
    }, (err) => {
      // TODO: handle error
    });

    // merge results into single cached tile
    return Promise.all(fetchRanges).then(allResponses => {
      // TODO: validate data and handle errors
      const values = new Float32Array(this.cache.tileSize * 4);
      let min = null;
      let max = null;
      let offset = 0;
      let dataType = null;
      let dimensions = null;

      allResponses.forEach(data => {
        const result = data.data;
        const rawData = result.values;
        const numSamples = result.numSamples;
        dimensions = result.dimensions.length;
        dataType = result.dataType;

        for (let i = 0; i < numSamples; i++) {
          for (let j = 0; j < dimensions; j++) {
            const curr = rawData[dimensions * i + j];
            values[offset + 4 * i + j] = curr;
            min = Math.min(curr, min);
            max = max === null ? curr : Math.max(curr, max);
          }
        }
        offset += rawData.length * 4;
      });
      this._min = Math.min(min, this._min);
      this._max = this._max === null ? max : Math.max(max, this._max);
      this.notifyListeners(TRACK_EVENT_LOADING, false);
      const tileData = {
        dataType: dataType,
        values: values,
        dimensions: dimensions
      };
      return new Tile(
        [start, end],
        [start, end],
        samplingRate,
        trackHeightPx,
        tileData
      );
    }, failure => {
      this.notifyListeners(TRACK_EVENT_LOADING, false);
    });
  }
}
export default DataTrack;
