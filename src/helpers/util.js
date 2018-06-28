import { Igloo } from "../../lib/igloojs/igloo.js";

const d3 = require("d3");
const _ = require("underscore");

import { FILTER_TYPES, CHROMOSOME_START_BASE_PAIRS, CHROMOSOME_SIZES, ENTITY_TYPE, ASSOCIATION_TYPE } from './constants.js';
import { QUERY_TYPE_GENOME } from '../models/query.js';

const formatSi = d3.format(".6s");

class Util {
  static chromosomeIndexToName(chromosomeIdx) {
    if (chromosomeIdx <= 21) {
      return "" + (chromosomeIdx + 1);
    } else if (chromosomeIdx === 22) {
      return "X";
    } else if (chromosomeIdx === 23) {
      return "Y";
    }
    return null;
  }

  static chromosomeIndex(absoluteBasePair) {
    // determine which chromosome this point falls within
    for (let i = 1; i < CHROMOSOME_START_BASE_PAIRS.length; i++) {
      const regionEnd = CHROMOSOME_START_BASE_PAIRS[i];
      if (absoluteBasePair <= regionEnd) {
        return i - 1;
      }
    }
    return null;
  }

  static splitRangeToChromosomeRanges(start, end) {
    let last = start;
    let curr = start;
    let ranges = [];
    for (let i = 0; i < CHROMOSOME_START_BASE_PAIRS.length - 1; i++) {
      if (curr >= CHROMOSOME_START_BASE_PAIRS[i] && curr < CHROMOSOME_START_BASE_PAIRS[i + 1]) {
        ranges.push([i, curr - CHROMOSOME_START_BASE_PAIRS[i]]);

        if (end <= CHROMOSOME_START_BASE_PAIRS[i + 1]) {
          ranges.push([i, end - CHROMOSOME_START_BASE_PAIRS[i]]);
          break;
        } else {
          curr = CHROMOSOME_START_BASE_PAIRS[i + 1];
          ranges.push([i, CHROMOSOME_SIZES[i]]);
        }
      }
    }
    let ret = [];
    for (let j = 0; j < ranges.length / 2; j++) {
      const startInterval = ranges[j * 2];
      const endInterval = ranges[j * 2 + 1];
      ret.push({
        contig: 'chr' + Util.chromosomeIndexToName(startInterval[0]),
        start: startInterval[1],
        end: endInterval[1],
      });
    }
    return ret;
  }

  static chromosomeRelativeBasePair(absoluteBasePair) {
    const chromosomeIndex = this.chromosomeIndex(absoluteBasePair);
    if (chromosomeIndex == null) {
      return null;
    } else {
      return {
        chromosomeIndex: chromosomeIndex,
        basePair:
          absoluteBasePair - CHROMOSOME_START_BASE_PAIRS[chromosomeIndex]
      };
    }
  }

  static chromosomeRelativeRange(startBp, endBp) {
    const start = this.chromosomeRelativeBasePair(startBp);
    const end = this.chromosomeRelativeBasePair(endBp);
    if (end.chromosomeIndex !== start.chromosomeIndex) {
      return {
        chromosomeIndex: start.chromosomeIndex,
        start: start.basePair,
        end: CHROMOSOME_SIZES[start.chromosomeIndex] - 1,
      };
    } else {
      return {
        chromosomeIndex: start.chromosomeIndex,
        start: start.basePair,
        end: end.basePair,
      };
    }
  }

  static chromosomeNameToIndex(name) {
    const suffix = name.slice(3);
    if (suffix === "X") {
      return 22;
    } else if (suffix === "Y") {
      return 23;
    } else {
      return parseInt(suffix, 10) - 1;
    }
  }

  static chromosomeRelativeToUniversalBasePair(chr, bp) {
    const idx =
      typeof chr !== "string" ? chr - 1 : this.chromosomeNameToIndex(chr);
    return CHROMOSOME_START_BASE_PAIRS[idx] + bp;
  }

  static floorToMultiple(x, k) {
    return Math.round(x % k === 0 ? x : x + k - x % k - k);
  }

  static ceilToMultiple(x, k) {
    return Math.round(x % k === 0 ? x : x + k - x % k);
  }

  static floorToClosestPower(x, k) {
    return Math.floor(Math.pow(k, Math.floor(Math.log(x) / Math.log(k))));
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

  static endBasePair(
    startBasePair,
    basePairsPerPixel,
    windowSize,
    round = true
  ) {
    const result = startBasePair + windowSize[0] * basePairsPerPixel;
    return round ? Math.floor(result) : result;
  }

  static basePairForScreenX(
    x,
    startBasePair,
    basePairsPerPixel,
    windowSize,
    round = true
  ) {
    const u = x / windowSize[0];
    const endBasePair = Util.endBasePair(
      startBasePair,
      basePairsPerPixel,
      windowSize,
      round
    );
    return startBasePair + u * (endBasePair - startBasePair);
  }

  static pixelForBasePair(bp, startBasePair, basePairsPerPixel, windowSize) {
    const endBasePair = Util.endBasePair(
      startBasePair,
      basePairsPerPixel,
      windowSize
    );
    const u = (bp - startBasePair) / (endBasePair - startBasePair);
    return u * windowSize[0];
  }

  static multiplyColor(color, d) {
    return color.map(val => Math.min(255, val * d));
  }

  static blendColors(color1, color2, alpha) {
    const c1 = Util.multiplyColor(color1, alpha);
    const c2 = Util.multiplyColor(color2, 1.0 - alpha);
    return [c1[0] + c2[0], c1[1] + c2[1], c1[2] + c2[2]];
  }

  static floorToPixel(u, px) {
    return Math.floor(u * px) / px;
  }

  static easeInOutQuadratic(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
  static easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
  }

  static applyFilterToQuery(query, filter) {
    if (!filter || !query) return query;
    if (filter.get(FILTER_TYPES.DATASET)) {
      const datasets = filter.get(FILTER_TYPES.DATASET).toArray();
      if (datasets.length === 1) {
        query.filters['source'] = datasets[0];
      } else {
        query.filters['source'] = { "$in": datasets };
      }
    }
    if (filter.get(FILTER_TYPES.TYPE)) {
      //  only apply this filter to the top level query if it is a genome query
      if (query.type === QUERY_TYPE_GENOME) {
        const types = filter.get(FILTER_TYPES.TYPE).toArray();
        if (types.length === 1) {
          query.filters['type'] = types[0];
        } else {
          query.filters['type'] = { "$in": types };
        }
      }
    }
    if (filter.get(FILTER_TYPES.VARIANT_TAG)) {
      // only apply this filter to the top level query if it is a genome query
      const tags = filter.get(FILTER_TYPES.VARIANT_TAG).toArray();
      if (tags.length === 1) {
        query.filters['info.variant_tags'] = tags[0];
      } else {
        query.filters['info.variant_tags'] = { "$in": tags };
      }
    }
    /*
    if (filter.get(FILTER_TYPES.P_VALUE)) {
      // if a p-value filter exists, remove it and add this one
      if (query.toEdges[0].filters['info.p-value']) {
        // TODO
      }
    }
    if (filter.get(FILTER_TYPES.ALLELE_FREQUENCY)) {
      // only apply this filter to the top level query if it is a genome query
      if (query.type === QUERY_TYPE_GENOME) {
        // TODO
      }
    }
    */
    return query;
  }

  static animate(
    start,
    end,
    callback,
    totalTime = 1.0,
    delta = 1.0 / 24.0,
    elapsed = 0.0,
    easingFunction = Util.easeInOutCubic
  ) {
    window.setTimeout(() => {
      const alpha = 1.0 - easingFunction(elapsed / totalTime);
      callback(alpha, start, end);
      elapsed += delta;
      if (elapsed < totalTime) {
        Util.animate(start, end, callback, totalTime, delta, elapsed);
      }
    }, delta);
  }

  static newRenderContext(domElem) {
    const igloo = new Igloo(domElem);
    const gl = igloo.gl;

    gl.getExtension("OES_texture_float");
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.disable(gl.DEPTH_TEST);

    // monkey patch igloo...
    igloo.cachedTextures = {};
    igloo.cachedTextureIdx = 0;
    igloo.maxCachedTextures = 1024;
    igloo.quad = igloo.array(Igloo.QUAD2);
    igloo.lineBuffer = igloo.array();
    igloo.lineColorBuffer = igloo.array();

    // handle quad rendering:
    igloo.drawQuad = function (shader) {
      shader.attrib("points", igloo.quad, 2);
      shader.draw(igloo.gl.TRIANGLE_STRIP, Igloo.QUAD2.length / 2);
    };

    igloo.drawLines = function (shader, lines, colors) {
      if (lines.length === 0) {
        return;
      }
      igloo.lineBuffer.update(lines);
      igloo.lineColorBuffer.update(colors);
      shader.attrib("points", igloo.lineBuffer, 2);
      shader.attrib("color", igloo.lineColorBuffer, 4);
      shader.draw(igloo.gl.LINES, lines.length / 2);
    };

    igloo.bindTexture = function (texDataGuid, texData, width, height) {
      // @! this is a quick fix over the existing solution which was uploading texture data each use
      // we should be handling GPU texture caching elsewhere

      // we don't have any texture unit management so safest thing to do is reuse slot 0
      const slot = 0;
      const cacheEntry = igloo.cachedTextures[texDataGuid];
      if (cacheEntry != null) {
        cacheEntry.tex.bind(slot);
        return slot;
      } else {
        // if we're over the cache limit, free the oldest
        const cachedTextureKeys = Object.keys(igloo.cachedTextures);
        if (cachedTextureKeys.length + 1 > igloo.maxCachedTextures) {
          // free the oldest texture
          let lowestIdx = Infinity;
          let lowestGuid = null;
          for (let k = 0; k < cachedTextureKeys.length; k++) {
            const guid = cachedTextureKeys[k];
            const idx = igloo.cachedTextures[guid].idx;
            if (idx < lowestIdx) {
              lowestIdx = idx;
              lowestGuid = guid;
            }
          }
          const oldestTex = igloo.cachedTextures[lowestGuid].tex;
          gl.deleteTexture(oldestTex.texture);
          delete igloo.cachedTextures[lowestGuid];
        }

        // allocate texture on the GPU
        const iglooTex = igloo.texture(
          null,
          gl.RGBA,
          gl.CLAMP_TO_EDGE,
          gl.NEAREST,
          gl.FLOAT
        );
        igloo.cachedTextures[texDataGuid] = {
          idx: ++igloo.cachedTextureIdx,
          tex: iglooTex
        };
        iglooTex.set(texData, width, height);
        iglooTex.bind(slot);
        return slot;
      }
    };

    return igloo;
  }

  static roundToHumanReadable(x) {
    const s = formatSi(x);
    switch (s[s.length - 1]) {
      case "G":
        return s.slice(0, -1) + "B";
      default:
        return s;
    }
  }
}

export default Util;
