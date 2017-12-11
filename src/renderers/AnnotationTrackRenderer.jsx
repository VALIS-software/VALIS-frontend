import Util from '../helpers/util.js';
import { GENOME_LENGTH } from '../helpers/constants.js';

const createText = require('../../lib/gl-render-text/createText.js');

const TEXT_PADDING_LEFT = 4;

export default class AnnotationTrackRenderer {

  constructor() {
    this.textures = {};
    this._hoverEnabled = false;
  }

  get hoverEnabled() {
    return this._hoverEnabled;
  }

  render(annotationTrack, height, yOffset, context, shaders, windowState) {
    const startBasePair = windowState.startBasePair;
    const basePairsPerPixel = windowState.basePairsPerPixel;
    const endBasePair = Util.endBasePair(startBasePair, basePairsPerPixel, windowState.windowSize);
    const trackHeightPx = windowState.windowSize[1] * height;
    const annotations = annotationTrack.getAnnotations(startBasePair, endBasePair, basePairsPerPixel, trackHeightPx);
    this._hoverEnabled = false;
    annotations.forEach(annotation => {
      let enableHover = 0;
      const annotationYOffset = annotation.yOffsetPx / windowState.windowSize[1];
      const annotationHeight = annotation.heightPx / windowState.windowSize[1];
      const annotationCenter = 0.5 * annotationHeight;
      
      // check if the annotation is currently hovered
      if (windowState.selectedBasePair && windowState.selectedTrackOffset) {
        if (windowState.selectedBasePair >= annotation.startBp && 
            windowState.selectedBasePair <= annotation.endBp &&
            windowState.selectedTrackOffset >= yOffset + annotationYOffset &&
            windowState.selectedTrackOffset <= (yOffset + annotationYOffset + annotationHeight)) {
            enableHover = 1;
            this._hoverEnabled = true;
        }
      }

      // render the segments:
      annotation.segments.forEach(segment => {
        // segment = [startBp, endBp, textureName, [R,G,B,A], heightPx]
        const shader = shaders.annotationShader;
        const textureName = segment[2];
        const color = segment[3] || [0.5, 0.5, 0.5, 1.0];
        const segmentHeight = (segment[4] || 32) / windowState.windowSize[1];

        const range = [segment[0] + annotation.startBp, segment[1] + annotation.startBp];

        if (textureName && !this.textures[textureName]) {
          this.textures[textureName] = null; // TODO: load texture
        }

        shader.use();
        if (textureName) {
          this.textures[textureName].bind(1);
          shader.uniformi('texture', 1);
        }
        color.map(d => { return 0.0 + d; });
        shader.uniform('color', color);
        shader.uniformi('showHover', enableHover);
        shader.uniformi('selectedBasePair', windowState.selectedBasePair);
        shader.uniform('windowSize', windowState.windowSize);
        shader.uniform('currentTileDisplayRange', range);
        shader.uniform('totalTileRange', range);
        shader.uniform('windowSize', windowState.windowSize);
        shader.uniform('tileHeight', segmentHeight);
        shader.uniform('displayedRange', [startBasePair, endBasePair]);
        shader.uniform('totalRange', [0, GENOME_LENGTH]);
        shader.uniform('offset', [0, yOffset + annotationYOffset + annotationCenter - 0.5 * segmentHeight]);
        if (windowState.selection) {
          shader.uniformi('showSelection', 1);
          shader.uniform('selectionBoundsMin', windowState.selection.min);
          shader.uniform('selectionBoundsMax', windowState.selection.max);
        }
        context.drawQuad(shader);
      });

      // render labels:
      annotation.labels.forEach(label => {
        const text = label[0];
        if (!this.textures[text]) {
          this.textures[text] = createText(context.gl, text, { size: 16, color: [255.0, 255.0, 255.0] }); 
        }
        // label format: [text, inside or outside, position: 0-left, 1-top, 2-right, 3-below, 4-center, offset-x, offset-y]

        const textHeight = this.textures[text].shape[0] / windowState.windowSize[1];
        const padding = TEXT_PADDING_LEFT / windowState.windowSize[0];
        const roiOffsetX = padding + 0.5 * (this.textures[text].roi.w - this.textures[text].shape[1]) / windowState.windowSize[0];
        const roiOffsetY = annotationCenter - 0.5 * this.textures[text].shape[0] / windowState.windowSize[1];
        const shader = shaders.textShader;
        const labelEndBp = annotation.startBp + this.textures[text].shape[1] * windowState.basePairsPerPixel;
        this.textures[text].bind(1);
        shader.use();
        shader.uniformi('texture', 1);
        shader.uniform('textureDimensions', this.textures[text].shape);
        shader.uniform('currentTileDisplayRange', [annotation.startBp, labelEndBp]);
        shader.uniform('totalTileRange', [annotation.startBp, labelEndBp]);
        shader.uniform('color', [1.0, 0.0, 0.5]);
        shader.uniform('windowSize', windowState.windowSize);
        shader.uniform('tileHeight', textHeight);
        shader.uniform('displayedRange', [startBasePair, endBasePair]);
        shader.uniform('totalRange', [0, GENOME_LENGTH]);
        shader.uniform('offset', [roiOffsetX, yOffset + annotationYOffset + roiOffsetY]);
        if (windowState.selection) {
          shader.uniformi('showSelection', 1);
          shader.uniform('selectionBoundsMin', windowState.selection.min);
          shader.uniform('selectionBoundsMax', windowState.selection.max);
        }
        context.drawQuad(shader);
      });
    });
  }
}
