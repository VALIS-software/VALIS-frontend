import Util from '../helpers/util.js';
import { 
    GENOME_LENGTH,
    COLOR1,
    COLOR2,
    COLOR3,
    COLOR4, 
    COLOR5,
    COLOR6,
    COLOR7,
    COLOR8, 
    TRACK_DATA_TYPE_BASE_PAIRS,
    TRACK_DATA_TYPE_GBANDS,
    TRACK_DATA_TYPE_SIGNAL,
} from '../helpers/constants.js';

export default class DataTrackRenderer {

  constructor() {
    this.textures = {};
  }

  render(dataTrack, color, height, xOffset, yOffset, context, shaders, startBasePair, endBasePair, renderRoiWidth, renderRoiHeight) {
    const basePairsPerPixel = (endBasePair - startBasePair) / renderRoiWidth;
    const trackHeightPx = renderRoiHeight * height;
    const tiles = dataTrack.getTiles(startBasePair, endBasePair, basePairsPerPixel, trackHeightPx);

    let j = 0;

    tiles.forEach(tile => {
        const texData = tile.tile.data.values;
        const dimensions = tile.tile.data.dimensions.length;
        const dataType = tile.tile.data.dataType;
        const texId = context.bindTexture(tile.tile.data.guid, texData, 1024, 1);
        let shader = shaders.signalShader;
        let c1 = COLOR1;
        let c2 = COLOR2;
        let c3 = COLOR3;
        let c4 = COLOR4;
        if (dataType === TRACK_DATA_TYPE_GBANDS) {
            shader = shaders.gbandShader;
            c1 = COLOR5;
            c2 = COLOR6;
            c3 = COLOR7;
            c4 = COLOR8;
        } else if (dataType === TRACK_DATA_TYPE_BASE_PAIRS) {
            shader = shaders.sequenceShader;
        }
        const tileExtents = tile.tile.tileRange[1] - tile.tile.tileRange[0];
        const tileMin = tile.tile.tileRange[0];
        const roi = [(tile.range[0] - tileMin) / tileExtents, (tile.range[1] - tileMin)/ tileExtents];
        shader.use();
        shader.uniformi('data', texId);
        shader.uniformi('isApproximate', tile.isApproximate ? 1 : 0);
        shader.uniformi('dimensions', dimensions);
        shader.uniform('dataMin', dataTrack.min);
        shader.uniform('dataMax', dataTrack.max);
        shader.uniform('color', color);
        shader.uniform('color1', c1);
        shader.uniform('color2', c2);
        shader.uniform('color3', c3);
        shader.uniform('color4', c4);
        shader.uniform('tile', 0.5 + 0.5 * j / tiles.length);
        shader.uniform('tileRoi', roi);
        shader.uniform('currentTileDisplayRange', tile.range);
        shader.uniform('totalTileRange', tile.tile.tileRange);
        shader.uniform('windowSize', [0, renderRoiHeight]);
        shader.uniform('tileHeight', height);
        shader.uniform('displayedRange', [startBasePair, endBasePair]);
        shader.uniform('offset', [xOffset, yOffset]); // specifies where to render the tile
        // shader.uniform('selectedBasePair', windowState.selectedBasePair + windowState.trackBasePairOffset);
        // if (windowState.selection) {
        //   shader.uniformi('showSelection', 1);
        //   shader.uniform('selectionBoundsMin', windowState.selection.min);
        //   shader.uniform('selectionBoundsMax', windowState.selection.max);
        // } else {
        //   shader.uniformi('showSelection', 0);
        // }
        context.drawQuad(shader);
        j += 1;
    });
  }
}
