import React from "react";

// import renderers
import GraphTrackRenderer from "../../renderers/GraphTrackRenderer.jsx";
import * as vertexShader from "./project.vert";
import * as fragShader from "./render.frag";

import Util from "../../helpers/util.js";

class OverlayView {
  constructor(guid) {
    this.guid = guid;
    this.graphRenderer = new GraphTrackRenderer();
    this.currentRegions = [];
    this.graphTrack = null;
    this.yOffset = 0;
  }

  static initializeShaders(context) {
    return {
      graphShader: context.program(vertexShader, fragShader)
    };
  }

  setYOffset(offset) {
    this.yOffset = offset;
  }

  getYOffset() {
    return this.yOffset;
  }

  setGraphTrack(track) {
    this.graphTrack = track;
  }

  removeGraphTrack() {
    this.graphTrack = null;
  }

  prepForRender() {
    this.currentRegions = [];
  }

  addRegion(track, trackHeightPx, yOffset, windowState, renderResult) {
    this.currentRegions.push({
      track,
      trackHeightPx,
      yOffset,
      windowState,
      renderResult
    });
  }

  get hoverEnabled() {
    return this.graphRenderer.hoverEnabled;
  }

  get hoverElement() {
    return this.graphRenderer.hoverElement;
  }

  render(context, shaders) {
    if (this.graphTrack) {
      // filter to just the regions which are needed by the graphTrack
      const annotation1Matches = [];
      const annotation2Matches = [];
      this.currentRegions.forEach(region => {
        if (region.track.hasAnnotation(this.graphTrack.annotationId1)) {
          annotation1Matches.push([region.renderResult, region.windowState]);
        }
        if (region.track.hasAnnotation(this.graphTrack.annotationId2)) {
          annotation2Matches.push([region.renderResult, region.windowState]);
        }
      });
      annotation1Matches.forEach(match1 => {
        annotation2Matches.forEach(match2 => {
          this.graphRenderer.render(
            this.graphTrack,
            match1[0],
            match2[0],
            context,
            shaders,
            match1[1],
            match2[1]
          );
        });
      });
    }
  }
}

export default OverlayView;
