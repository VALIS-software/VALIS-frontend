import Util from '../helpers/util.js';
import { GENOME_LENGTH } from '../helpers/constants.js';
import GPUTextFonts from '../helpers/GPUTextFonts.js';

const GPUText = require('../../lib/gputext/gputext.js');
const GPUTextWebGL = require('../../lib/gputext/gputext-webgl.js');

const stats = require('stats-lite');
const hsl = require('color-space/hsl');

const TEXT_PADDING_LEFT = 4;
const CLICK_RANGE_PIXELS = 5;

export default class AnnotationTrackRenderer {

  constructor() {
    this._textBufferCache = {};
    this._textMat4 = new Float32Array([
      1.0, 0.0, 0.0, 0.0,
      0.0, 1.0, 0.0, 0.0,
      0.0, 0.0, 1.0, 0.0,
      0.0, 0.0, 0.0, 1.0,
    ]);
    this._hoverEnabled = false;
    this._hoverElement = null;
  }

  get hoverEnabled() {
    return this._hoverEnabled;
  }

  get hoverElement() {
    return this._hoverElement;
  }

  checkForHover(annotation, height, yOffset, windowState) {
    const annotationYOffset = annotation.yOffsetPx / windowState.windowSize[1];
    const annotationHeight = annotation.heightPx / windowState.windowSize[1];
    if (windowState.selectedBasePair && windowState.selectedTrackOffset) {
      const clickableRange = this.rangeForClickableRegion(annotation, windowState);
      if (windowState.selectedBasePair >= clickableRange[0] &&
          windowState.selectedBasePair <= clickableRange[1] &&
          windowState.selectedTrackOffset >= yOffset + annotationYOffset &&
          windowState.selectedTrackOffset <= (yOffset + annotationYOffset + annotationHeight)) {
          this._hoverEnabled = true;
          this._hoverElement = annotation;
          return true;
      }
    }
    return false;
  }

  rangeForClickableRegion(annotation, windowState) {
    const midPoint = (annotation.endBp - annotation.startBp) / 2.0 + annotation.startBp;
    const clickRange = Math.max(CLICK_RANGE_PIXELS * windowState.basePairsPerPixel, (annotation.endBp - annotation.startBp) / 2.0);
    const minClick = midPoint - clickRange;
    const maxClick = midPoint + clickRange;
    return [minClick, maxClick];
  }

  render(annotationTrack, trackColor, height, yOffset, context, shaders, windowState) {
    const startBasePair = windowState.startBasePair;
    const basePairsPerPixel = windowState.basePairsPerPixel;
    const endBasePair = Util.endBasePair(startBasePair, basePairsPerPixel, windowState.windowSize);
    const windowSize = windowState.windowSize;
    const trackHeightPx = windowState.windowSize[1] * height;
    const annotationData = annotationTrack.getAnnotations(startBasePair, endBasePair, basePairsPerPixel, trackHeightPx);
    const annotations = annotationData.annotations;
    const countInRange = annotationData.countInRange;
    this._hoverEnabled = false;
    this._hoverElement = null;
    const renderResults = {};

    const normalizedCounts = [];
    const pixels = [];
    annotations.forEach(annotation => {
      const pixelWidth = (annotation.endBp - annotation.startBp) / basePairsPerPixel;
      normalizedCounts.push(annotation.count / pixelWidth);
      pixels.push(pixelWidth);
    });

    const totalNormalizedCounts = stats.sum(normalizedCounts);
    const weights = [];
    normalizedCounts.forEach(count => {
      weights.push(count / totalNormalizedCounts);
    });

    const weightAverage = stats.mean(weights);
    const weightVariance = (weights.length > 1) ? stats.variance(weights) : 1;

    const shader = shaders.annotationShader;
    shader.use(); // we want to minimize shader binding
    shader.attrib('points', context.quad, 2);

    shader.uniform('displayedRange', [startBasePair, endBasePair]);
    shader.uniform('totalRange', [0, GENOME_LENGTH]);
    shader.uniformi('selectedBasePair', windowState.selectedBasePair);
    shader.uniform('windowSize', windowState.windowSize);
    if (windowState.selection) {
      shader.uniformi('showSelection', 1);
      shader.uniform('selectionBoundsMin', windowState.selection.min);
      shader.uniform('selectionBoundsMax', windowState.selection.max);
    }

    let _shaderHover = null;
    let _shaderTileHeight = null;

    annotations.forEach(annotation => {
      const aggregation = annotation.aggregation;
      let enableHover = 0;
      const annotationYOffset = annotation.yOffsetPx / windowState.windowSize[1];
      let annotationHeight = annotation.heightPx / windowState.windowSize[1];
      if (aggregation) annotationHeight = trackHeightPx / windowState.windowSize[1];
      const annotationCenter = 0.5 * annotationHeight;

      const x0Px = Util.pixelForBasePair(annotation.startBp, startBasePair, basePairsPerPixel, windowSize);
      const x1Px = Util.pixelForBasePair(annotation.endBp, startBasePair, basePairsPerPixel, windowSize);

      // out of visible bounds
      if (x1Px < 0 || x0Px > windowState.windowSize[0]) {
        return;
      }

      const xPx = (x1Px + x0Px) * 0.5;
      const yPx = (yOffset + annotationYOffset + annotationCenter) * windowState.windowSize[1];

      renderResults[annotation.id] = [xPx / windowSize[0], yPx / windowSize[1]];

      // check if the annotation is currently hovered
      if (this.checkForHover(annotation, height, yOffset, windowState)) {
        enableHover = 1;
      }

      // render the segments:
      annotation.segments.forEach(segment => {
        // segment = [startBp, endBp, textureName, [R,G,B,A], heightPx]
        const textureName = segment[2];
        let segmentHeight = (segment[4] || 32) / windowState.windowSize[1];

        if (aggregation) segmentHeight = trackHeightPx / windowState.windowSize[1];

        const range = this.rangeForClickableRegion(annotation, windowState);
        // NOTE: We will deprecate segment rendering within an annotation. This was a poor 
        // early design choice. The frontend should make decisions on how
        // to visually display the annotation instead of the backend deciding this via segments

        if (textureName && !this.textures[textureName]) {
          this.textures[textureName] = null; // TODO: load texture
        }

        if (textureName) {
          this.textures[textureName].bind(1);
          shader.uniformi('texture', 1);
        }

        let color = segment[3] || [0.5, 0.5, 0.5, 1];
        if (aggregation) {
          const normalizedCount = annotation.count / ((range[1] - range[0]) / basePairsPerPixel);
          let brightness = 0.5 + ((normalizedCount / totalNormalizedCounts) - weightAverage) / Math.sqrt(weightVariance);
          const alpha = 0.8;
          brightness = alpha + brightness * (1.0 - alpha);
          color = hsl.rgb([trackColor * 360.0, 50.0, 0.5]).map(d => brightness * d / 3.0);
          color.push(1.0);
        }

        shader.uniform('color', color);
        shader.uniform('offset', [0, yOffset + annotationYOffset + annotationCenter - 0.5 * segmentHeight]);
        shader.uniform('currentTileDisplayRange', range);
        // only update shader values when they change
        if (_shaderHover !== enableHover) {
          _shaderHover = enableHover;
          shader.uniformi('showHover', enableHover);
        }
        if (_shaderTileHeight !== segmentHeight) {
          _shaderTileHeight = segmentHeight;
          shader.uniform('tileHeight', segmentHeight);
        }

        shader.draw(context.gl.TRIANGLE_STRIP, 4);
      });
    });

    // render labels
    // units of 'px' refer to non-dpi-scaled 'DOM' pixels
    const font = GPUTextFonts.getFont('OpenSans-Regular');
    // igloo doesn't support vertex buffer offset or blend modes so It's simpler to just use API directly
    const gl = context.gl;
    const viewportAspect = gl.drawingBufferWidth / gl.drawingBufferHeight;
    const canvasDisplayScale = gl.canvas.width / gl.canvas.clientWidth;
    const trackYOffsetPx = yOffset * windowState.windowSize[1];
    const fontSizePx = 20;

    gl.enable(gl.BLEND);
    gl.blendEquation(gl.FUNC_ADD);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // store the font atlas in texture units
    // (we could use some GL texture management so we're not rebinding textures each frame)
    const atlasTextureUnit = 1;
    gl.activeTexture(gl.TEXTURE0 + atlasTextureUnit);
    const atlasTexture = GPUTextFonts.getAtlasTexture(gl, font);
    gl.bindTexture(gl.TEXTURE_2D, atlasTexture);

    const textShader = shaders.textShader;
    gl.useProgram(textShader.deviceHandle);

    gl.enableVertexAttribArray(textShader.attributeLocations.position);
    gl.enableVertexAttribArray(textShader.attributeLocations.uv);

    // common uniform data
    gl.uniform1i(textShader.uniformLocations.glyphAtlas, atlasTextureUnit);
    gl.uniform1f(textShader.uniformLocations.fieldRange, font.descriptor.fieldRange_px);
    gl.uniform2f(textShader.uniformLocations.resolution, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform4f(textShader.uniformLocations.color, 1.0, 1.0, 1.0, 1.0);

    for (let a = 0; a < annotations.length; a++) {
      const annotation = annotations[a];
      const annotationHeightPx = annotation.aggregation ? trackHeightPx : annotation.heightPx;

      // only show aggregation labels on hover
      const showLabels = !(annotation.aggregation && !this.checkForHover(annotation, height, yOffset, windowState));

      const labels = annotation.labels;

      for (let l = 0; (l < annotation.labels.length) && showLabels; l++) {
        const label = annotation.labels[l];
        const text = label[0];

        let cacheEntry = this._textBufferCache[text];

        if (cacheEntry == null) {
          // generate text vertex buffer
          const glyphLayout = GPUText.layout(text, font.descriptor, {});
          cacheEntry = this._textBufferCache[text] = {
            bounds: glyphLayout.bounds,
            buffer: GPUTextWebGL.createTextBuffer(gl, GPUText.generateVertexData(glyphLayout)),
            inUse: true,
          };
        } else {
          cacheEntry.inUse = true;
        }

        const textBuffer = cacheEntry.buffer;

        // non-dpi-scaled 'DOM' pixels
        const x0Px = Util.pixelForBasePair(annotation.startBp, startBasePair, basePairsPerPixel, windowSize);
        const x1Px = Util.pixelForBasePair(annotation.endBp, startBasePair, basePairsPerPixel, windowSize);
        const y0Px = trackYOffsetPx + annotation.yOffsetPx;
        const widthPx = x1Px - x0Px;
        const textHeightPx = Math.min(annotationHeightPx, fontSizePx);
        const textWidthPx = (cacheEntry.bounds.r - cacheEntry.bounds.l) * textHeightPx;

        // out of visible bounds
        if (x1Px < 0 || x0Px > windowState.windowSize[0]) {
          continue;
        }

        // center text in annotation x
        const xPx = x0Px + Math.max(widthPx * 0.5 - textWidthPx * 0.5, 0);
        // center text in annotation y
        const yPx = y0Px + annotationHeightPx * 0.5 - textHeightPx * 0.5;

        // compose transform - convert px units to clip-space
        const s = (textHeightPx * canvasDisplayScale) / (gl.drawingBufferHeight * 0.5);
        const xClipspace = 2 * (xPx * canvasDisplayScale - gl.drawingBufferWidth * 0.5) / gl.drawingBufferWidth;
        const yClipSpace = -2 * (yPx * canvasDisplayScale - gl.drawingBufferHeight * 0.5) / gl.drawingBufferHeight;

        this._textMat4[0] = s; this._textMat4[5] = s;
        this._textMat4[12] = xClipspace; this._textMat4[13] = yClipSpace;

        gl.uniformMatrix4fv(textShader.uniformLocations.transform, false, this._textMat4);

        gl.bindBuffer(gl.ARRAY_BUFFER, textBuffer.deviceHandle);
        gl.vertexAttribPointer(
          textShader.attributeLocations.position,
          textBuffer.vertexLayout.position.elements,
          gl.FLOAT,
          false,
          textBuffer.vertexLayout.position.strideBytes,
          textBuffer.vertexLayout.position.offsetBytes
        );
        gl.vertexAttribPointer(
          textShader.attributeLocations.uv,
          textBuffer.vertexLayout.uv.elements,
          gl.FLOAT,
          false,
          textBuffer.vertexLayout.uv.strideBytes,
          textBuffer.vertexLayout.uv.offsetBytes
        );

        gl.drawArrays(textBuffer.drawMode, 0, textBuffer.vertexCount);
      }
    }

    gl.disable(gl.BLEND);
    gl.disableVertexAttribArray(textShader.attributeLocations.uv);
    gl.disableVertexAttribArray(textShader.attributeLocations.position);
    
    // text buffer cache management
    // delete any text buffers not used in this frame
    const cacheKeys = Object.keys(this._textBufferCache);
    for (let i = 0; i < cacheKeys.length; i++) {
      const key = cacheKeys[i];
      const cacheEntry = this._textBufferCache[key];
      if (!cacheEntry.inUse) {
        GPUTextWebGL.deleteTextBuffer(gl, cacheEntry.buffer);
        delete this._textBufferCache[key];
      } else {
        // mark as unused for next round
        cacheEntry.inUse = false;
      }
    }

    return renderResults;
  }
}
