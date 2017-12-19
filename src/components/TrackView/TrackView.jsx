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


class TrackView {
  constructor(guid, appModel) {
    this.guid = guid;
    this.appModel = appModel;
    this.height = 0.1;
    this.yOffset = 0.0;
    this.annotationTrack = null;
    this.dataTrack = null;
    this.dataRenderer = new DataTrackRenderer();
    this.annotationRenderer = new AnnotationTrackRenderer();
    this.basePairOffset = 0;
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

  get hoverElement() {
    return this.annotationRenderer.hoverElement;
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

  getHeight() {
    return this.height;
  }

  setYOffset(offset) {
    this.yOffset = offset;
  }

  setBasePairOffset(offset) {
    this.basePairOffset = offset;
  }

  getBasePairOffset() {
    return this.basePairOffset;
  }

  render(context, shaders, windowState) {
    // copy window state and apply track specific offsets:
    const trackWindowState = Object.assign({}, windowState);
    trackWindowState.startBasePair += this.basePairOffset;
    trackWindowState.trackBasePairOffset = this.basePairOffset;
    if (this.annotationTrack !== null) {
      this.annotationRenderer.render(this.annotationTrack, this.height, this.yOffset, context, shaders, trackWindowState);
    }
    if (this.dataTrack !== null) {
      this.dataRenderer.render(this.dataTrack, this.height, this.yOffset, context, shaders, trackWindowState);
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
    let min = null;
    let max = null;
    if (this.dataTrack !== null) {
      min = this.dataTrack.min;
      max = this.dataTrack.max;
    }
    const title = this.getTitle();
    const top = windowState.windowSize[1] * this.yOffset;
    const height = windowState.windowSize[1] * this.height;
    const key = this.guid;
    const model = this.appModel;
    const offset = this.getBasePairOffset();
    return (<TrackHeader key={key} offset={offset} guid={key} top={top} height={height} min={min} max={max} title={title} appModel={model} />);
  }
}

export default TrackView;
