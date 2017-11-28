import React from 'react';
import { Igloo } from '../../../lib/igloojs/igloo.js';

import Util from '../../helpers/util.js';
import { GENOME_LENGTH } from '../../helpers/constants.js';

import vertexShader from './project.vert';
import fragmentShader from './render.frag';
import GenomeAPI from '../../models/api.js';
import Annotation from '../Annotation/Annotation.jsx';

class TrackView {
  constructor(genomeId, trackId) {
    this.genomeId = genomeId;
    this.trackId = trackId;
    this.model = null;
    this.api = new GenomeAPI();
    this.height = 0.1;
    this.yOffset = 0.0;
    this.api.getTrack(genomeId, trackId).then(model => {
      this.model = model;
    });
  }

  static initializeShader(context) {
    return context.program(vertexShader, fragmentShader);
  }

  setColor(color) {
    this.color = color;
  }

  setHeight(height) {
    this.height = height;
  }

  setYOffset(offset) {
    this.yOffset = offset;
  }

  render(context, shader, windowState) {
    const startBasePair = windowState.startBasePair;
    const basePairsPerPixel = windowState.basePairsPerPixel;
    const endBasePair = Util.endBasePair(startBasePair, basePairsPerPixel, windowState.windowSize);
    if (this.model === null) {
      return;
    }
    const tiles = this.model.getTiles(startBasePair, endBasePair, basePairsPerPixel);
    let j = 0;
    tiles.forEach(tile => {
        context.textures[j].bind(1 + j);
        context.textures[j].set(tile.tile.data, 1024, 1);
        shader.use();
        shader.uniformi('data', 1 + j);
        shader.uniform('tile', 0.5 + 0.5 * j / tiles.length);
        shader.uniform('currentTileDisplayRange', tile.range);
        shader.uniform('totalTileRange', tile.tile.tileRange);
        shader.uniform('color', this.color);
        shader.uniform('windowSize', windowState.windowSize);
        shader.uniform('trackHeight', this.height);
        shader.uniform('displayedRange', [startBasePair, endBasePair]);
        shader.uniform('totalRange', [0, GENOME_LENGTH]);
        shader.uniform('offset', [0, this.yOffset]);

        if (windowState.selection) {
          shader.uniformi('showSelection', 1);
          shader.uniform('selectionBoundsMin', windowState.selection.min);
          shader.uniform('selectionBoundsMax', windowState.selection.max);
        }

        context.drawQuad(shader);
        j += 1;
    });
  }

  getAnnotations(windowState) {
    if (this.model === null) {
      return [];
    }
    const startBasePair = windowState.startBasePair;
    const basePairsPerPixel = windowState.basePairsPerPixel;
    const endBasePair = Util.endBasePair(startBasePair, basePairsPerPixel, windowState.windowSize);
    const annotations = this.model.getAnnotations(startBasePair, endBasePair, basePairsPerPixel);
    return annotations.map(annotation => {
      // update the overlay elem:
      const start = Util.pixelForBasePair(annotation.startBp, startBasePair, basePairsPerPixel, windowState.windowSize);
      let end = Util.pixelForBasePair(annotation.endBp, startBasePair, basePairsPerPixel, windowState.windowSize);
      end = Math.min(windowState.windowSize[0], end);
      const top = (this.yOffset) * windowState.windowSize[1];
      return (<Annotation key={this.trackId + annotation.id} left={start} width={end-start} top={top} annotation={annotation} />);
    });
  }
}

export default TrackView;
