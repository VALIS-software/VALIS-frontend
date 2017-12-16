import { Igloo } from '../../lib/igloojs/igloo.js';

const d3 = require('d3');

const formatSi = d3.format('.6s');

class Util {
  static floorToMultiple(x, k) {
    return Math.round((x % k === 0) ? x :  x + k - x % k - k);
  }

  static ceilToMultiple(x, k) {
    return Math.round((x % k === 0) ? x :  x + k - x % k);
  }

  static discreteRangeContainingRange(range, discretizationSize) {
    const start = Util.floorToMultiple(range[0], discretizationSize);
    const end = Util.ceilToMultiple(range[1], discretizationSize);
    return [start, end];
  }

  static inRange(range, value) {
    return value >= range[0] && value <= range[1];
  }

  static rangesIntersect(range1, range2) {
    return Util.inRange(range1, range2[0]) || Util.inRange(range1, range2[1]);
  }

  static endBasePair(startBasePair, basePairsPerPixel, windowSize) {
    return startBasePair + Math.floor(windowSize[0] * basePairsPerPixel);
  }

  static basePairForScreenX(x, startBasePair, basePairsPerPixel, windowSize) {
    const u = x / windowSize[0];
    const endBasePair = Util.endBasePair(startBasePair, basePairsPerPixel, windowSize);
    return startBasePair + (u * (endBasePair - startBasePair));
  }

  static pixelForBasePair(bp, startBasePair, basePairsPerPixel, windowSize) {
    const endBasePair = Util.endBasePair(startBasePair, basePairsPerPixel, windowSize);
    const u = (bp - startBasePair) / (endBasePair - startBasePair);
    return u * windowSize[0];
  }

  static newRenderContext(domElem) {
    const MAX_TEXTURES = 128;
    const igloo = new Igloo(domElem);
    const gl = igloo.gl;
    const textures = [];
    
    gl.getExtension('OES_texture_float');
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);
    for (let i = 0; i < MAX_TEXTURES; i++) {
      const newTexture = igloo.texture(null, gl.RGBA, gl.CLAMP_TO_EDGE, gl.NEAREST, gl.FLOAT);
      textures.push(newTexture);
    }

    // monkey patch igloo... 
    igloo.textures = textures;
    igloo.shaders = {};
    igloo.quad = igloo.array(Igloo.QUAD2);

    // handle quad rendering:
    igloo.drawQuad = function(shader) {
        shader.attrib('points', igloo.quad, 2);
        shader.draw(igloo.gl.TRIANGLE_STRIP, Igloo.QUAD2.length / 2);
    };

    return igloo;
  }

  static roundToHumanReadable(x) {
    const s = formatSi(x);
    switch (s[s.length - 1]) {
      case 'G': return s.slice(0, -1) + 'B';
      default: return s;
    }
  }
}

export default Util;