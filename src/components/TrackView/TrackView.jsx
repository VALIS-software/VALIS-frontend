import React from 'react';

// import shaders
import textFragmentShader from './text.frag';
import vertexShader from './project.vert';
import signalShader from './render_signal.frag';
import sequenceShader from './render_sequence.frag';
import gbandShader from './render_gband.frag';
import annotationShader from './render_annotation.frag';

// import renderers
import AnnotationTrackRenderer from '../../renderers/AnnotationTrackRenderer.jsx';
import DataTrackRenderer from '../../renderers/DataTrackRenderer.jsx';

import TrackHeader from '../TrackHeader/TrackHeader.jsx';
import TrackBackground from '../TrackBackground/TrackBackground.jsx';

import Util from '../../helpers/util.js';

class TrackView {
  constructor(guid, appModel, color=0.6, height=0.1) {
    this.guid = guid;
    this.appModel = appModel;
    this.height = height;
    this.yOffset = 0.0;
    this.color = color;
    this.annotationTrack = null;
    this.dataTrack = null;
    this.dataRenderer = new DataTrackRenderer();
    this.annotationRenderer = new AnnotationTrackRenderer();
  }

  static initializeShaders(context) {
    return {
      annotationShader: context.program(vertexShader, annotationShader),
      signalShader: context.program(vertexShader, signalShader),
      sequenceShader: context.program(vertexShader, sequenceShader),
      gbandShader: context.program(vertexShader, gbandShader),
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

  setColor(color) {
    this.color = color;
  }

  getColor() {
    return this.color;
  }

  setYOffset(offset) {
    this.yOffset = offset;
  }

  getYOffset() {
    return this.yOffset;
  }

  render(context, shaders, windowState, overlays, region, xOffset, xWidth) {
    const roundedHeight = Util.floorToPixel(this.height, windowState.windowSize[1]);
    // if (this.annotationTrack !== null) {
    //   const renderResult = this.annotationRenderer.render(this.annotationTrack, this.color, roundedHeight, 0.5, this.yOffset, context, shaders, trackWindowState);
    //   overlays.forEach(overlay => {
    //     overlay.addRegion(this.annotationTrack, roundedHeight, this.yOffset, trackWindowState, renderResult);
    //   });
    // }
    if (this.dataTrack !== null) {
      this.dataRenderer.render(this.dataTrack, 
                               this.color, 
                               roundedHeight, 
                               xOffset, 
                               this.yOffset, 
                               context, 
                               shaders, 
                               region.startBasePair, 
                               region.endBasePair, 
                               xWidth, 
                               windowState.windowSize[1]);
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
    let showAxis = false;
    if (this.dataTrack !== null) {
      min = this.dataTrack.min;
      max = this.dataTrack.max;
      showAxis = this.dataTrack.showAxis;
    }
    const title = this.getTitle();
    const top = windowState.windowSize[1] * this.yOffset;
    const height = Math.floor(windowState.windowSize[1] * this.height);
    const key = this.guid;
    const model = this.appModel;


    return (<TrackHeader key={key} showAxis={showAxis} guid={key} top={top} height={height} min={min} max={max} title={title} appModel={model} />);
  }

  getBackground(windowState) {
    const top = windowState.windowSize[1] * this.yOffset;
    const height = Math.floor(windowState.windowSize[1] * this.height);
    const key = this.guid;
    return (<TrackBackground key={key} top={top} height={height} />);
  }
}

export default TrackView;
