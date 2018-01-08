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

  render(graphTrack, annotations1, annotations2, context, shaders, windowState, secondWindowState) {
    const startBasePair = windowState.startBasePair;
    const basePairsPerPixel = windowState.basePairsPerPixel;
    const endBasePair = Util.endBasePair(startBasePair, basePairsPerPixel, windowState.windowSize);

    // TODO figure out the relative base pair offset, using secondWindowState
    const tiles = graphTrack.getTiles(startBasePair, endBasePair, basePairsPerPixel, 0);
    const shader = shaders.graphShader;
    
    this._hoverEnabled = false;
    this._hoverElement = null;

    tiles.forEach(tile => {
      const edges = tile.tile.data.values;
      const edgeArray = new Float32Array(edges.length * 4);
      const edgeColorArray = new Float32Array(edges.length * 8);
      let idx = 0;
      edges.forEach(edge => {
        const a1Id = edge[0];
        const a2Id = edge[1];
        const weight = edge[2];
        const loc1 = annotations1[a1Id];
        const loc2 = annotations2[a2Id];
        if (loc1 && loc2) {
          edgeArray[idx] = loc1[0];
          edgeArray[idx + 1] = loc1[1];
          edgeArray[idx + 2] = loc2[0];
          edgeArray[idx + 3] = loc2[1];

          edgeColorArray[idx]     = weight;
          edgeColorArray[idx + 1] = weight;
          edgeColorArray[idx + 2] = weight;
          edgeColorArray[idx + 3] = 1.0;

          edgeColorArray[idx + 4] = weight;
          edgeColorArray[idx + 5] = weight;
          edgeColorArray[idx + 6] = weight;
          edgeColorArray[idx + 7] = 1.0;
        }
        idx += 4;
      });
      shader.use();
      context.drawLines(shader, edgeArray, edgeColorArray);
    });
  }
}
