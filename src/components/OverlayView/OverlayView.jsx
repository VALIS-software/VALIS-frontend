import React from 'react';

// import renderers
import GraphTrackRenderer from '../../renderers/GraphTrackRenderer.jsx';

import Util from '../../helpers/util.js';

class OverlayView {
  constructor(guid) {
    this.guid = guid;
    this.graphRenderer = new GraphTrackRenderer();
    this.currentRegions = [];
    this.graphTrack = null;
    this.yOffset = 0;
  }

  // static initializeShaders(context) {
  //   return {
  //     graphShader: context.program(vertexShader, graphShader),
  //   };
  // }

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

  addRegion(track, trackHeightPx, yOffset, windowState) {
    this.currentRegions.push({ track, trackHeightPx, yOffset, windowState });
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
          annotation1Matches.push(region.windowState);
        }
        if (region.track.hasAnnotation(this.graphTrack.annotationId2)) {
          annotation2Matches.push(region.windowState); 
        }
      });
      annotation1Matches.forEach(window1 => {
        annotation2Matches.forEach(window2 => {
          this.graphRenderer.render(this.graphTrack, this.yOffset, context, shaders, window1, window2);
        });
      });
    }
  }
}

export default OverlayView;
