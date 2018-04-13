// Dependencies
import React from 'react';
import PropTypes from 'prop-types';
import Util from '../../helpers/util.js';
import { GENOME_LENGTH } from '../../helpers/constants.js';
import { 
  APP_EVENT_ADD_TRACK,
  APP_EVENT_REMOVE_TRACK,
  APP_EVENT_REORDER_TRACKS,
  APP_EVENT_ADD_OVERLAY,
  APP_EVENT_REMOVE_OVERLAY,
  APP_EVENT_TRACK_VIEW_SETTINGS_UPDATED,
} from '../../models/appModel.js';


import { VIEW_EVENT_STATE_CHANGED, VIEW_EVENT_SELECTION, VIEW_EVENT_CLICK } from '../../models/viewModel.js';

import TrackView from '../TrackView/TrackView.jsx';
import OverlayView from '../OverlayView/OverlayView.jsx';
import TrackToolTip from '../TrackToolTip/TrackToolTip.jsx';
import XAxis from '../XAxis/XAxis.jsx';

// Styles
import './MultiTrackViewer.scss';

const _ = require('underscore');
const d3 = require('d3');

const MIN_TRACK_HEIGHT_PIXELS = 32.0;
const ANNOTATION_OFFSET = 2.0;
const TRACK_PADDING_PX = 16;

class MultiTrackViewer extends React.Component {
  constructor(props) {
    super(props);
    this.views = {};
    this.overlayViews = {};
    this.tracks = [];
    this.overlays = [];
    this.updateViews = this.updateViews.bind(this);
    this.updateOverlays = this.updateOverlays.bind(this);
    this.updateViewState = this.updateViewState.bind(this);
    this.updateSelection = this.updateSelection.bind(this);
    this.handleClick = this.handleClick.bind(this);
    this.classNames = '';

    // listen to track change updates
    props.model.addListener(this.updateViews, [APP_EVENT_ADD_TRACK, 
                                               APP_EVENT_REORDER_TRACKS, 
                                               APP_EVENT_TRACK_VIEW_SETTINGS_UPDATED,
                                               APP_EVENT_REMOVE_TRACK]);

    props.model.addListener(this.updateOverlays, [APP_EVENT_ADD_OVERLAY, APP_EVENT_REMOVE_OVERLAY]);
    this.viewModel = props.viewModel;
    this.onDrop = this.onDrop.bind(this);
    this.onDragOver = this.onDragOver.bind(this);
    this.onDragLeave = this.onDragLeave.bind(this);
  }

  componentDidMount() {
    // that handles destruction of WebGL Context when the page changes
    window.addEventListener('load', () => {
      const domElem = document.querySelector('#webgl-canvas');
      const currentWidth = domElem.clientWidth;
      const currentHeight = domElem.clientHeight;

      // scale canvas to account for device pixel ratio
      const devicePixelRatio = window.devicePixelRatio || 1;
      domElem.width = Math.round(currentWidth * devicePixelRatio);
      domElem.height = Math.round(currentHeight * devicePixelRatio);
      domElem.style.width = domElem.width / devicePixelRatio + 'px';
      domElem.style.height = domElem.height / devicePixelRatio + 'px';

      const bpp = GENOME_LENGTH / domElem.clientWidth;
      const windowSize = [domElem.clientWidth, domElem.clientHeight];

      this.viewModel.init(bpp, windowSize);
      this.viewModel.bindListeners(domElem);

      this.viewModel.addListener(this.updateViewState, VIEW_EVENT_STATE_CHANGED);
      this.viewModel.addListener(this.updateSelection, VIEW_EVENT_SELECTION);
      this.viewModel.addListener(this.handleClick, VIEW_EVENT_CLICK);

      this.renderContext = Util.newRenderContext(domElem);
      this.shaders = TrackView.initializeShaders(this.renderContext);
      this.overlayShaders = OverlayView.initializeShaders(this.renderContext);
      
      const renderFrame = () => {
        this.renderGL();
        requestAnimationFrame(renderFrame);
      };
      renderFrame();
    });

    window.addEventListener('resize', () => {
      // Hack WebGL resizing not working as I want it to :/
      location.reload();
    });
  }

  onDrop(evt) {
    this.props.model.removeTrack(evt.dataTransfer.getData('guid'));
    this.removeTrackHintVisible = false;
  }

  onDragOver(evt) {
    evt.dataTransfer.dropEffect = 'move';
    evt.preventDefault();
    this.removeTrackHintVisible = true;
  }

  onDragLeave(evt) {
    this.removeTrackHintVisible = false;
  }


  getTrackInfoAtCoordinate(coord) {
    const viewState = this.viewModel.getViewState();
    const start = viewState.startBasePair;
    const bpp = viewState.basePairsPerPixel;
    const windowSize = viewState.windowSize;
    const end = Util.endBasePair(start, bpp, windowSize);
    

    // figure out which track the click was inside of:
    let track = null;
    const clickOffset = (coord[1]) / windowSize[1];
    const hoveredBasePair = Util.basePairForScreenX(coord[0], start, bpp, windowSize, false);
    let trackOffsetPx = null;
    for (let i = 0; i < this.tracks.length; i++) {
      const currTrack = this.tracks[i];
      const currOffset = this.views[currTrack.guid].getYOffset() + this.views[currTrack.guid].getHeight();
      if (currOffset >= clickOffset) {
        track = currTrack;
        trackOffsetPx = currOffset * windowSize[1];
        break;
      }
    }

    let trackHeightPx = null;
    let trackCenterPx = null;
    let trackBasePairOffset = null;
    let dataTooltip = null;
    
    if (track) {
      trackHeightPx = this.views[track.guid].getHeight() * windowSize[1];
      trackBasePairOffset = this.views[track.guid].getBasePairOffset();
      trackCenterPx =  trackOffsetPx - trackHeightPx / 2.0;
      dataTooltip = null;
      if (track.dataTrack) {
        dataTooltip = track.dataTrack.getTooltipData(hoveredBasePair + trackBasePairOffset, clickOffset, start + trackBasePairOffset, end + trackBasePairOffset, bpp, trackHeightPx);
      }
    }

    return {
      yOffset: clickOffset,
      basePair: hoveredBasePair,
      basePairOffset: trackBasePairOffset,
      track: track,
      tooltip: dataTooltip,
      trackHeightPx: trackHeightPx,
      trackCenterPx: trackCenterPx,
    };
  }

  handleClick(evt) {
    if (this.hoverElement) {
      this.props.viewModel.showEntityDetails(this.hoverElement);
    }
  }

  updateViewState(event) {
    const classes = [];
    const viewState = event.data.currentViewState;
    if (viewState.selectEnabled) {
      classes.push('select-active');
    }
    if (viewState.zoomEnabled) {
      classes.push('zoom-active');
    }
    if (viewState.dragEnabled) {
      classes.push('drag-active');
    }
    this.classNames = classes.join(' ');
    this.forceUpdate();
  }

  updateSelection(event) {
    this.viewModel.setViewRegionUsingRange(event.data.startBp, event.data.endBp);
  }

  updateOverlays(event) {
    const newViews = {};
    this.overlays = event.sender.overlays;
    this.overlays.forEach(overlay => {
      if (!this.overlayViews[overlay.guid]) {
        newViews[overlay.guid] = new OverlayView(overlay.guid);
      } else {
        newViews[overlay.guid] = this.overlayViews[overlay.guid];
      }
      newViews[overlay.guid].setGraphTrack(overlay.graphTrack);
    });
    this.overlayViews = newViews;
  }

  updateViews(event) {
    const newViews = {};
    this.tracks = event.sender.tracks;
    event.sender.tracks.forEach(track => {
      if (!this.views[track.guid]) {
        newViews[track.guid] = new TrackView(track.guid, this.props.model, this.props.viewModel, track.color, track.height, track.basePairOffset);
      } else {
        newViews[track.guid] = this.views[track.guid];
      }
      const trackView = newViews[track.guid];

      if (track.dataTrack) {
        trackView.setDataTrack(track.dataTrack);
      }

      if (track.annotationTrack) {
        trackView.setAnnotationTrack(track.annotationTrack);
      }

      trackView.setColor(track.color);
      trackView.setBasePairOffset(track.basePairOffset);
      trackView.setHeight(track.height);
    });
    this.views = newViews;
  }

  renderGL() {
    const gl = this.renderContext.gl;
    gl.clear(gl.COLOR_BUFFER_BIT);
    const windowState = this.viewModel.getViewState();
    const viewGuids = _.keys(this.views);
    const numTracks = viewGuids.length;
    const padding = TRACK_PADDING_PX / windowState.windowSize[1];
    this.hoverEnabled = false;
    this.hoverElement = null;
    let currOffset = padding;

    
    const overlayViews = _.keys(this.overlayViews).map(key => this.overlayViews[key]);
    overlayViews.forEach(view => view.prepForRender());
    
    for (let i = 0; i < numTracks; i++) {
      // setup track position
      const track = this.views[viewGuids[i]];
      track.setYOffset(currOffset + windowState.trackOffset);
      currOffset += track.getHeight() + padding;
      track.render(this.renderContext, this.shaders, windowState, overlayViews);
      if (track.hoverEnabled && !this.hoverEnabled) {
        this.hoverEnabled = true;
        this.hoverElement = track.hoverElement;
      }
    }

    overlayViews.forEach(view => view.render(this.renderContext, this.overlayShaders));
    
    this.forceUpdate();
  }

  renderTooltip() {
    let tooltip = (<div />);

    if (!this.viewModel) return tooltip;

    const viewState = this.viewModel.getViewState();
    if (viewState.lastDragCoord && !viewState.selectEnabled) {
      const coord = viewState.lastDragCoord.slice();
      const trackInfo = this.getTrackInfoAtCoordinate(coord);
      const x = ANNOTATION_OFFSET + Util.pixelForBasePair(trackInfo.basePair, viewState.startBasePair, viewState.basePairsPerPixel, viewState.windowSize);
      
      if (trackInfo.track !== null && trackInfo.tooltip !== null && trackInfo.tooltip.values) {
        const y = (-trackInfo.tooltip.positionNormalized + 0.5) * trackInfo.trackHeightPx + trackInfo.trackCenterPx;
        const basePair = trackInfo.basePair + trackInfo.basePairOffset;
        const values = trackInfo.tooltip.values;
        tooltip = (<TrackToolTip x={x} y={y} colors={trackInfo.tooltip.colors} basePair={basePair} values={values} />);
      }
    }
    return tooltip;
  }

  render() {
    const headers = [];
    const backgrounds = [];
    const viewGuids = _.keys(this.views);
    
    if (this.viewModel) {
      const windowState = this.viewModel.getViewState();
      for (let i = 0; i < viewGuids.length; i++) {
        const track = this.views[viewGuids[i]];
        headers.push(track.getHeader(windowState));
        backgrounds.push(track.getBackground(windowState));
      }
    }

    const tooltip = this.renderTooltip();

    const removeTrackHint = this.removeTrackHintVisible ? (<div className="remove-hint">Remove Track</div>) : undefined;
    return (
      <div className="content">
        {removeTrackHint}
        <div id="track-headers">
          {headers}
        </div>
        <div id="track-backgrounds">
          {backgrounds}
        </div>
        <XAxis viewModel={this.viewModel} />
        <canvas 
          id="webgl-canvas" 
          className={this.classNames} 
          onDragOver={this.onDragOver} 
          onDrop={this.onDrop} 
          onDragLeave={this.onDragLeave} 
        />
        <div id="webgl-overlay">
          {tooltip}
        </div>
      </div>
    );
  }
}

MultiTrackViewer.propTypes = {
   model: PropTypes.object,
   viewModel: PropTypes.object,
};

export default MultiTrackViewer;
