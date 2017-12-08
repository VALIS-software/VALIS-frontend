import React from 'react';
import { Igloo } from '../../../lib/igloojs/igloo.js';

import Util from '../../helpers/util.js';
import { GENOME_LENGTH } from '../../helpers/constants.js';


import textFragmentShader from './text.frag';
import vertexShader from './project.vert';
import fragmentShader from './render_signal.frag';
import annotationShader from './render_annotation.frag';
import TrackHeader from '../TrackHeader/TrackHeader.jsx';

const createText = require('../../../lib/gl-render-text/createText.js');
const uuid = require('uuid/v4');

class TrackView {
  constructor() {
    this.guid = uuid();
    this.height = 0.1;
    this.yOffset = 0.0;
    this.annotationTrack = null;
    this.dataTrack = null;
    this.text = {};
  }

  static initializeShaders(context) {
    return {
      tileShader: context.program(vertexShader, fragmentShader),
      textShader: context.program(vertexShader, textFragmentShader),
    };
  }

  setAnnotationTrack(track) {
    this.annotationTrack = track;
  }

  removeAnnotationTrack() {

  }

  setDataTrack(track) {
    this.dataTrack = track;
  }

  removeDataTrack() {

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

  render(context, shaders, windowState) {
    const startBasePair = windowState.startBasePair;
    const basePairsPerPixel = windowState.basePairsPerPixel;
    const endBasePair = Util.endBasePair(startBasePair, basePairsPerPixel, windowState.windowSize);
    const trackHeightPx = windowState.windowSize[1] * this.height;
    if (this.dataTrack !== null) {
      const tiles = this.dataTrack.getTiles(startBasePair, endBasePair, basePairsPerPixel, trackHeightPx);
      let j = 0;
      tiles.forEach(tile => {
          context.textures[j].bind(1 + j);
          context.textures[j].set(tile.tile.data, 1024, 1);
          const shader = shaders.tileShader;
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
          shader.uniform('selectedBasePair', windowState.selectedBasePair);
          if (windowState.selection) {
            shader.uniformi('showSelection', 1);
            shader.uniform('selectionBoundsMin', windowState.selection.min);
            shader.uniform('selectionBoundsMax', windowState.selection.max);
          }
          context.drawQuad(shader);
          j += 1;
      });
    }
    if (this.annotationTrack !== null) {
      const annotations = this.annotationTrack.getAnnotations(startBasePair, endBasePair, basePairsPerPixel, trackHeightPx);
      annotations.forEach(annotation => {
        if (!this.text[annotation.id]) {
          this.text[annotation.id] = createText(context.gl, 'SNX1032', { size: 16, color: [1.0, 0.0, 255.0] }); 
        }
        const annotationHeight = 32 / windowState.windowSize[1];
        const yOffset = annotation.yOffsetPx / windowState.windowSize[1];
        const shader = shaders.textShader;
        annotation.endBp = annotation.startBp + 128.0 * windowState.basePairsPerPixel;
        this.text[annotation.id].bind(1);
        shader.use();
        shader.uniformi('texture', 1);
        shader.uniform('textureDimensions', this.text[annotation.id].shape);
        shader.uniform('currentTileDisplayRange', [annotation.startBp, annotation.endBp]);
        shader.uniform('totalTileRange', [annotation.startBp, annotation.endBp]);
        shader.uniform('color', [1.0, 0.0, 0.5]);
        shader.uniform('windowSize', windowState.windowSize);
        shader.uniform('trackHeight', annotationHeight);
        shader.uniform('displayedRange', [startBasePair, endBasePair]);
        shader.uniform('totalRange', [0, GENOME_LENGTH]);
        shader.uniform('offset', [0, this.yOffset + yOffset]);
        if (windowState.selection) {
          shader.uniformi('showSelection', 1);
          shader.uniform('selectionBoundsMin', windowState.selection.min);
          shader.uniform('selectionBoundsMax', windowState.selection.max);
        }
        context.drawQuad(shader);
      });
    }
  }

  getTitle() {
    return 'Untitled';
  }

  getHeader(windowState) {
    const top = windowState.windowSize[1] * this.yOffset;
    const height = windowState.windowSize[1] * this.height;
    const key = this.guid;
    return (<TrackHeader key={key} top={top} height={height} track={this} />);
  }
}

export default TrackView;
