import React from 'react';

// import shaders
import textFragmentShader from './text.frag';
import vertexShader from './project.vert';
import fragmentShader from './render_signal.frag';
import annotationShader from './render_annotation.frag';

// import renderers
import AnnotationTrackRenderer from '../../renderers/AnnotationTrackRenderer.jsx';
import DataTrackRenderer from '../../renderers/DataTrackRenderer.jsx';

import TrackHeader from '../TrackHeader/TrackHeader.jsx';

const uuid = require('uuid/v4');

class TrackView {
  constructor() {
    this.guid = uuid();
    this.height = 0.1;
    this.yOffset = 0.0;
    this.annotationTrack = null;
    this.dataTrack = null;
    this.dataRenderer = new DataTrackRenderer();
    this.annotationRenderer = new AnnotationTrackRenderer();
  }

  static initializeShaders(context) {
    return {
      annotationShader: context.program(vertexShader, annotationShader),
      tileShader: context.program(vertexShader, fragmentShader),
      textShader: context.program(vertexShader, textFragmentShader),
    };
  }

  get hoverEnabled() {
    return this.annotationRenderer.hoverEnabled;
  }

  setAnnotationTrack(track) {
    this.annotationTrack = track;
  }

  removeAnnotationTrack() {
    this.annotationTrack = null;
  }

  setDataTrack(track) {
    this.dataTrack = track;
  }

  removeDataTrack() {
    this.dataTrack = null;
  }

  setHeight(height) {
    this.height = height;
  }

  setYOffset(offset) {
    this.yOffset = offset;
  }

  render(context, shaders, windowState) {
    if (this.annotationTrack !== null) {
      this.annotationRenderer.render(this.annotationTrack, this.height, this.yOffset, context, shaders, windowState);
    }
    if (this.dataTrack !== null) {
      this.dataRenderer.render(this.dataTrack, this.height, this.yOffset, context, shaders, windowState);
    }
  }

  getTitle() {
    if (this.dataTrack) {
      return this.dataTrack.title;
    } else if (this.annotationTrack) {
      return this.annotationTrack.title;
    }
    return 'Empty Track';
  }

  getHeader(windowState) {
    const top = windowState.windowSize[1] * this.yOffset;
    const height = windowState.windowSize[1] * this.height;
    const key = this.guid;
    return (<TrackHeader key={key} top={top} height={height} track={this} />);
  }
}

export default TrackView;
