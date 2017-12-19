import Util from '../helpers/util.js';
import { GENOME_LENGTH } from '../helpers/constants.js';

export default class DataTrackRenderer {

  constructor() {
    this.textures = {};
  }

  render(dataTrack, height, yOffset, context, shaders, windowState) {
    const startBasePair = windowState.startBasePair;
    const basePairsPerPixel = windowState.basePairsPerPixel;
    const endBasePair = Util.endBasePair(startBasePair, basePairsPerPixel, windowState.windowSize);
    const trackHeightPx = windowState.windowSize[1] * height;
    const tiles = dataTrack.getTiles(startBasePair, endBasePair, basePairsPerPixel, trackHeightPx);

    let j = 0;

    tiles.forEach(tile => {
        const texId = context.bindTexture(tile.tile.data.guid, tile.tile.data, 1024, 1);
        const shader = shaders.tileShader;
        shader.use();
        shader.uniformi('data', texId);
        shader.uniformi('isApproximate', tile.isApproximate ? 1 : 0);
        shader.uniform('dataMin', dataTrack.min);
        shader.uniform('dataMax', dataTrack.max);
        shader.uniform('tile', 0.5 + 0.5 * j / tiles.length);
        shader.uniform('currentTileDisplayRange', tile.range);
        shader.uniform('totalTileRange', tile.tile.tileRange);
        shader.uniform('windowSize', windowState.windowSize);
        shader.uniform('tileHeight', height);
        shader.uniform('displayedRange', [startBasePair, endBasePair]);
        shader.uniform('totalRange', [0, GENOME_LENGTH]);
        shader.uniform('offset', [0, yOffset]);
        shader.uniform('selectedBasePair', windowState.selectedBasePair + windowState.trackBasePairOffset);
        if (windowState.selection) {
          shader.uniformi('showSelection', 1);
          shader.uniform('selectionBoundsMin', windowState.selection.min);
          shader.uniform('selectionBoundsMax', windowState.selection.max);
        }
        context.drawQuad(shader);
        j += 1;
    });
  }
}
