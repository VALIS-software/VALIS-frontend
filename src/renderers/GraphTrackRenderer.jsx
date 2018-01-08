import Util from '../helpers/util.js';
import { GENOME_LENGTH } from '../helpers/constants.js';



export default class GraphTrackRenderer {

  constructor() {
    this.textures = {};
    this._hoverEnabled = false;
    this._hoverElement = null;
  }

  get hoverEnabled() {
    return this._hoverEnabled;
  }

  get hoverElement() {
    return this._hoverElement;
  }

  render(graphTrack, height, yOffset, context, shaders, windowState) {
    const startBasePair = windowState.startBasePair;
    const basePairsPerPixel = windowState.basePairsPerPixel;
    const endBasePair = Util.endBasePair(startBasePair, basePairsPerPixel, windowState.windowSize);
    const trackHeightPx = windowState.windowSize[1] * height;
    const tiles = graphTrack.getTiles(startBasePair, endBasePair, basePairsPerPixel, trackHeightPx);
    this._hoverEnabled = false;
    this._hoverElement = null;
    tiles.forEach(tile => {
      console.log(tile);
    });
  }
}
