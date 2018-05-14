import * as React from "react";

// import shaders
import * as vertexShader from "./project.vert";
import * as signalShader from "./render_signal.frag";
import * as sequenceShader from "./render_sequence.frag";
import * as gbandShader from "./render_gband.frag";
import * as annotationShader from "./render_annotation.frag";

// import renderers
import AnnotationTrackRenderer from "../../renderers/AnnotationTrackRenderer";
import DataTrackRenderer from "../../renderers/DataTrackRenderer";

import TrackHeader from "../TrackHeader/TrackHeader";
import TrackBackground from "../TrackBackground/TrackBackground";

import Util from "../../helpers/util";

import { GPUTextWebGL } from "../../../lib/gputext/gputext-webgl";

class TrackView {
  constructor(
    guid,
    appModel,
    viewModel,
    color = 0.6,
    height = 0.1,
    basePairOffset = 0
  ) {
    this.guid = guid;
    this.appModel = appModel;
    this.viewModel = viewModel;
    this.height = height;
    this.yOffset = 0.0;
    this.color = color;
    this.annotationTrack = null;
    this.dataTrack = null;
    this.dataRenderer = new DataTrackRenderer();
    this.annotationRenderer = new AnnotationTrackRenderer();
    this.basePairOffset = basePairOffset;
  }

  static initializeShaders(context) {
    const msdfCode = GPUTextWebGL.generateMsdfShaderCode();

    return {
      annotationShader: context.program(vertexShader, annotationShader),
      signalShader: context.program(vertexShader, signalShader),
      sequenceShader: context.program(vertexShader, sequenceShader),
      gbandShader: context.program(vertexShader, gbandShader),
      textShader: GPUTextWebGL.createTextProgram(context.gl, {})
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

  setBasePairOffset(offset) {
    this.basePairOffset = offset;
  }

  getBasePairOffset() {
    return this.basePairOffset;
  }

  render(context, shaders, windowState, overlays) {
    // copy window state and apply track specific offsets:
    const trackWindowState = Object.assign({}, windowState);
    trackWindowState.startBasePair += this.basePairOffset;
    trackWindowState.trackBasePairOffset = this.basePairOffset;

    const roundedHeight = Util.floorToPixel(
      this.height,
      windowState.windowSize[1]
    );

    if (this.annotationTrack !== null) {
      const renderResult = this.annotationRenderer.render(
        this.annotationTrack,
        this.color,
        roundedHeight,
        this.yOffset,
        context,
        shaders,
        trackWindowState
      );
      overlays.forEach(overlay => {
        overlay.addRegion(
          this.annotationTrack,
          roundedHeight,
          this.yOffset,
          trackWindowState,
          renderResult
        );
      });
    }
    if (this.dataTrack !== null) {
      this.dataRenderer.render(
        this.dataTrack,
        this.color,
        roundedHeight,
        this.yOffset,
        context,
        shaders,
        trackWindowState
      );
    }
  }

  getTitle() {
    if (this.dataTrack) {
      return this.dataTrack.title;
    } else if (this.annotationTrack) {
      return this.annotationTrack.title;
    }
    return "Empty Track";
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
    const offset = this.getBasePairOffset();
    const viewModel = this.viewModel;
    return (
      <TrackHeader
        key={key}
        showAxis={showAxis}
        offset={offset}
        guid={key}
        top={top}
        height={height}
        min={min}
        max={max}
        title={title}
        appModel={model}
        viewModel={viewModel}
      />
    );
  }

  getBackground(windowState) {
    const top = windowState.windowSize[1] * this.yOffset;
    const height = Math.floor(windowState.windowSize[1] * this.height);
    const key = this.guid;
    return <TrackBackground key={key} top={top} height={height} />;
  }
}

export default TrackView;
