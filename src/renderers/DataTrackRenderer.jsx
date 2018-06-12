import Util from "../helpers/util.js";
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
  TRACK_DATA_TYPE_SIGNAL
} from "../helpers/constants.js";

export default class DataTrackRenderer {
  constructor() {
    this.textures = {};
  }

  render(dataTrack, color, height, yOffset, context, shaders, windowState) {
    const startBasePair = windowState.startBasePair;
    const basePairsPerPixel = windowState.basePairsPerPixel;
    const endBasePair = Util.endBasePair(
      startBasePair,
      basePairsPerPixel,
      windowState.windowSize
    );
    const trackHeightPx = windowState.windowSize[1] * height;
    const tiles = dataTrack.getTiles(
      startBasePair,
      endBasePair,
      basePairsPerPixel,
      trackHeightPx
    );

    if (tiles.length === 0) {
      return;
    }

    let shader = shaders.signalShader;
    const gl = context.gl;

    // assuming all tiles have the same dataType
    // do we need to mix dataTypes within a single track? If so, we need to group draw calls but shader before rendering
    if (!tiles[0].tile) {
      return;
    }
    const dataType = tiles[0].tile.data.dataType;

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

    shader.use();
    shader.attrib("points", context.quad, 2);

    shader.uniform("color1", c1);
    shader.uniform("color2", c2);
    shader.uniform("color3", c3);
    shader.uniform("color4", c4);

    shader.uniform("dataMin", dataTrack.min);
    shader.uniform("dataMax", dataTrack.max);

    shader.uniform("displayScale", gl.canvas.clientWidth / gl.canvas.width);
    shader.uniform("windowSize", windowState.windowSize);
    shader.uniform("tileHeight", height);
    shader.uniform("displayedRange", [startBasePair, endBasePair]);
    shader.uniform("totalRange", [0, GENOME_LENGTH]);
    shader.uniform("offset", [0, yOffset]);
    shader.uniform(
      "selectedBasePair",
      windowState.selectedBasePair + windowState.trackBasePairOffset
    );
    if (windowState.selection) {
      shader.uniformi("showSelection", 1);
      shader.uniform("selectionBoundsMin", windowState.selection.min);
      shader.uniform("selectionBoundsMax", windowState.selection.max);
    } else {
      shader.uniformi("showSelection", 0);
    }

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const texData = tile.tile.data.values;
      const dimensions = tile.tile.data.dimensions.length;

      const texId = context.bindTexture(tile.tile.data.guid, texData, 1024, 1);
      const tileExtents = tile.tile.tileRange[1] - tile.tile.tileRange[0];
      const tileMin = tile.tile.tileRange[0];
      const roi = [
        (tile.range[0] - tileMin) / tileExtents,
        (tile.range[1] - tileMin) / tileExtents
      ];

      // warning: igloo js triggers getUniformLocation every time when setting an unused uniform
      // this is a performance killer
      shader.uniformi("data", texId);
      // shader-specific data
      if (shader === shaders.signalShader) {
        shader.uniformi("dimensions", dimensions);
      } else if (shader === shaders.sequenceShader) {
        shader.uniform("tileRoi", roi);
      }
      shader.uniform("currentTileDisplayRange", tile.range);
      shader.uniform("totalTileRange", tile.tile.tileRange);

      // unused in shaders
      // shader.uniformi('isApproximate', tile.isApproximate ? 1 : 0);
      // shader.uniform('tile', 0.5 + 0.5 * i / tiles.length);

      shader.draw(context.gl.TRIANGLE_STRIP, 4);
    }
  }
}
