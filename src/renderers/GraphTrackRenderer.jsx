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
          edgeArray[idx*4] = loc1[0];
          edgeArray[idx*4 + 1] = loc1[1];
          edgeArray[idx*4 + 2] = loc2[0];
          edgeArray[idx*4 + 3] = loc2[1];

          const color = Util.blendColors([0,0,1], [1,0,0], weight);

          edgeColorArray[idx*8]     = color[0];
          edgeColorArray[idx*8 + 1] = color[1];
          edgeColorArray[idx*8 + 2] = color[2];
          edgeColorArray[idx*8 + 3] = 1.0;

          edgeColorArray[idx*8 + 4] = color[0];
          edgeColorArray[idx*8 + 5] = color[1];
          edgeColorArray[idx*8 + 6] = color[2];
          edgeColorArray[idx*8 + 7] = 1.0;
        }
        idx++;
      });
      shader.use();
      context.drawLines(shader, edgeArray, edgeColorArray);
    });
  }
}
