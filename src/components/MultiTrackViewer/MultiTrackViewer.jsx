// Dependencies
import React from 'react';
import PropTypes from 'prop-types';
import Util from '../../helpers/util.js';
import { GENOME_LENGTH } from '../../helpers/constants.js';
import { 
  APP_EVENT_ADD_TRACK,
  APP_EVENT_REMOVE_TRACK,
  APP_EVENT_REORDER_TRACKS,
} from '../../models/appModel.js';

import StatusTile from '../StatusTile/StatusTile.jsx';
import TrackView from '../TrackView/TrackView.jsx';
import TrackToolTip from '../TrackToolTip/TrackToolTip.jsx';

// Styles
import './MultiTrackViewer.scss';

const _ = require('underscore');
const d3 = require('d3');

const TICK_SPACING_PIXELS = 100.0;
const MIN_TRACK_HEIGHT_PIXELS = 32.0;
const ANNOTATION_OFFSET = 2.0;
const TRACK_PADDING_PX = 16;

class MultiTrackViewer extends React.Component {
  constructor(props) {
    super(props);
    this.handleLoad = this.handleLoad.bind(this);
    this.views = {};
    this.overlayElem = null;
    this.tracks = [];
    this.updateViews = this.updateViews.bind(this);
    props.model.addListener(this.updateViews, [APP_EVENT_ADD_TRACK, 
                                               APP_EVENT_REORDER_TRACKS, 
                                               APP_EVENT_REMOVE_TRACK]);
    this.onDrop = this.onDrop.bind(this);
    this.onDragOver = this.onDragOver.bind(this);
    this.onDragLeave = this.onDragLeave.bind(this);
    this.onDoubleClick = this.onDoubleClick.bind(this);
  }

  componentDidMount() {
    // TODO: Need to write componentDidUnmount
    // that handles destruction of WebGL Context when the page changes
    window.addEventListener('load', this.handleLoad);
    const domElem = document.querySelector('#webgl-canvas');

    // need to reset explicit canvas dims to prevent canvas stretch scaling
    domElem.width = domElem.clientWidth;
    domElem.height = domElem.clientHeight;
    this.overlayElem = document.querySelector('#webgl-overlay');

    this.basePairsPerPixel = GENOME_LENGTH / domElem.clientWidth;
    this.startBasePair = 0;
    this.windowSize = [domElem.clientWidth, domElem.clientHeight];
    this.selectEnabled = false;
    this.trackOffset = 0.0;
    this.zoomEnabled = false;
    this.dragEnabled = false;
    this.lastDragCoord = null;
    this.startDragCoord = null;
    this.hoverEnabled = false;
    this.hoverElement = null;
    this.removeTrackHintVisible = false;
  }

  getWindowState() {
    if (!this || !this.windowSize) return {};

    let x = null;
    let y = null;
    const windowHeight = this.windowSize[1];
    if (this.lastDragCoord) {
      x = Util.basePairForScreenX(this.lastDragCoord[0], this.startBasePair, this.basePairsPerPixel, this.windowSize);  
      y = this.lastDragCoord[1] / windowHeight;
    }
    
    const windowState = {
      windowSize: this.windowSize,
      basePairsPerPixel: this.basePairsPerPixel,
      trackBasePairOffset: 0,
      startBasePair: this.startBasePair,
      selectedBasePair: x,
      selectedTrackOffset: y,
    };

    if (this.selectEnabled) {
      if (this.startDragCoord && this.lastDragCoord) {
        windowState.selection = {
          min: this.startDragCoord,
          max: this.lastDragCoord,
        };
      }
    }
    return windowState;
  }

  getClass() {
    const classes = [];
    if (this === null) {
      return '';
    }

    if (this.zoomEnabled) {
      classes.push('zoom-active');
    }

    if (this.dragEnabled) {
      classes.push('drag-active');
    }

    if (this.selectEnabled) {
      classes.push('select-active');
    }

    if (this.hoverEnabled) {
      classes.push('hover-active');
    }

    return classes.join(' ');
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

  onDoubleClick(evt) {
    const coord = [evt.nativeEvent.offsetX, evt.nativeEvent.offsetY];
    const windowSize = this.windowSize;
    const hoveredBasePair = Util.basePairForScreenX(coord[0], this.startBasePair, this.basePairsPerPixel, windowSize);
    const pixel = coord[0];
    Util.animate(this.basePairsPerPixel, this.basePairsPerPixel / 4.0, (alpha, start, end) => {
      this.basePairsPerPixel = alpha * start + (1.0 - alpha) * end;
      this.centerBasePairOnPixel(hoveredBasePair, pixel);
    }, 1.0);
  }

  getTrackInfoAtCoordinate(coord) {
      // TODO: Clean up this code... it's a mess!
      // get base pair: 
      const start = this.startBasePair;
      const bpp = this.basePairsPerPixel;
      const windowSize = this.windowSize;
      const end = Util.endBasePair(start, bpp, windowSize);
      const trackOffset = (coord[1] - this.trackOffset * windowSize[1]) / windowSize[1];

      let delta = 0.0;
      let idx = null;
      let i = 0;
      let trackHeightPx = null; 
      let finalDelta = null;
      let trackBasePairOffset = 0;
      let track = null;
      const hoveredBasePair = Util.basePairForScreenX(coord[0], start, bpp, windowSize);

      this.tracks.forEach(currTrack => {
        delta = this.views[currTrack.guid].getYOffset() + this.views[currTrack.guid].getHeight();
        if (trackOffset <= delta && idx === null) {
          idx = i;
          trackHeightPx = this.views[this.tracks[i].guid].getHeight() * windowSize[1];
          trackBasePairOffset = this.views[this.tracks[i].guid].getBasePairOffset();
          finalDelta = delta * windowSize[1];
        }
        i++;
      });

      if (idx !== null) {
        track = this.tracks[idx];
        let dataTooltip = null;
        // check that there is a data track
        if (track.dataTrack) {
          dataTooltip = track.dataTrack.getTooltipData(hoveredBasePair + trackBasePairOffset, trackOffset, start, end, bpp, trackHeightPx);
          // make sure that the current cursor is on a valid value:
          if (dataTooltip && dataTooltip.values) {
            return {
              yOffset: trackOffset,
              basePair: hoveredBasePair,
              basePairOffset: trackBasePairOffset,
              track: track,
              tooltip: dataTooltip,
              trackHeightPx: trackHeightPx,
              trackCenterPx: finalDelta - trackHeightPx/2.0 + this.trackOffset * windowSize[1],
            };
          }
        } else {
          // no tooltip for annotation track
          return {
            yOffset: trackOffset,
            basePair: hoveredBasePair,
            basePairOffset: 0,
            track: track,
            tooltip: null,
            trackHeightPx: trackHeightPx,
            trackCenterPx: finalDelta - trackHeightPx/2.0 + this.trackOffset * windowSize[1],
          };
        }
      }
      return {
        yOffset: trackOffset,
        basePair: hoveredBasePair,
        track: track,
        tooltip: null,
        trackCenterPx: null,
        trackHeightPx: null,
      };
  }


  handleMouseMove(e) {
    if (this.dragEnabled) {
      if (!this.selectEnabled) {
        const deltaX = e.offsetX - this.lastDragCoord[0];
        const deltaY = e.offsetY - this.lastDragCoord[1];
        if (Math.abs(deltaY) > 0) {
          const delta = Math.min(0.0, this.trackOffset + deltaY / this.windowSize[1]);
          this.trackOffset = delta;
        }

        if (Math.abs(deltaX) > 0) {
          const delta = -deltaX * this.basePairsPerPixel;
          if (this.modifySingleTrack) {
            const trackInfo = this.getTrackInfoAtCoordinate(this.startDragCoord);
            if (trackInfo.track) {
              const last = this.views[trackInfo.track.guid].getBasePairOffset();
              this.views[trackInfo.track.guid].setBasePairOffset(last + delta);
            }
          } else {
            this.startBasePair += delta;
          }
        }
        // otherwise the update lags slightly!
        this.forceUpdate();
      }
    }


    this.lastDragCoord = [e.offsetX, e.offsetY];
  }

  totalTrackHeight() {
    let total = 0.0;
    const viewGuids = _.keys(this.views);
    viewGuids.forEach(guid => {
      total += this.views[guid].getHeight();
    });
    return total;
  }

  centerOnBasePair(basePair) {
    this.startBasePair = basePair - this.basePairsPerPixel * this.windowSize[0] / 2.0;
  }

  centerBasePairOnPixel(basePair, pixel) {
    this.startBasePair = basePair - pixel * this.basePairsPerPixel;
  }

  handleMouse(e) {
    if (this.dragEnabled) {
      return;
    } else if (this.zoomEnabled) {
      if (Math.abs(e.deltaY) > 0) {
        // get track at position:
        const track = this.getTrackInfoAtCoordinate([e.offsetX, e.offsetY]).track;
        if (track) {
          const currTrackHeight = this.views[track.guid].getHeight();
          const newTrackHeight = currTrackHeight / (1.0 - (e.deltaY / this.windowSize[1]));  
          if (newTrackHeight * this.windowSize[1] > MIN_TRACK_HEIGHT_PIXELS) {
            this.views[track.guid].setHeight(newTrackHeight);
            // compute the offset so that the y position remains constant after zoom:
            this.trackOffset = this.trackOffset + (currTrackHeight - newTrackHeight)/2.0;
          }
        }
        // otherwise the update lags slightly!
        this.forceUpdate();
      }
    } else if (this.basePairsPerPixel <= GENOME_LENGTH / (this.windowSize[0])) {
      // x pan sets the base pair!
      if (Math.abs(e.deltaX) > 0) {
        const delta = (e.deltaX * this.basePairsPerPixel);
        if (this.modifySingleTrack) {
          const trackInfo = this.getTrackInfoAtCoordinate([e.offsetX, e.offsetY]);
          if (trackInfo.track) {
            const last = this.views[trackInfo.track.guid].getBasePairOffset();
            this.views[trackInfo.track.guid].setBasePairOffset(last + delta);
          }
        } else {
          this.startBasePair += delta;
        }
        this.panning = true;
      } else {
        this.panning = false;
        if (Math.abs(e.deltaY) > 0) {
          const lastBp = Util.basePairForScreenX(e.offsetX, 
                                                  this.startBasePair, 
                                                  this.basePairsPerPixel, 
                                                  this.windowSize);
          
          let newBpPerPixel = this.basePairsPerPixel / (1.0 - (e.deltaY / 1000.0));  
          newBpPerPixel = Math.min(GENOME_LENGTH / (this.windowSize[0]), newBpPerPixel);

          // compute the new startBasePair so that the cursor remains
          // centered on the same base pair after scaling:
          const rawPixelsAfter = lastBp / newBpPerPixel;
          this.startBasePair = (rawPixelsAfter - e.offsetX) * newBpPerPixel;
          this.basePairsPerPixel = newBpPerPixel;
        }
      }
    }
  }

  handleMouseDown(e) {
    this.dragEnabled = true;
    this.lastDragCoord = [e.offsetX, e.offsetY];
    this.startDragCoord = [e.offsetX, e.offsetY];
  }

  handleMouseUp(e) {
    this.props.model.setFocus(this.hoverElement);
    this.dragEnabled = false;
    this.lastDragCoord = null;
    this.startDragCoord = null;
    this.selectEnabled = false;
  }

  handleKeydown(e) {
    if (e.key === 'Alt') {
      this.selectEnabled = true;
    } else if (e.key === 'Control') {
      this.zoomEnabled = true;
    } else if (e.key === 'Shift') {
      this.modifySingleTrack = true;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      const x = this.basePairsPerPixel * 128;
      const delta = (e.key === 'ArrowLeft') ? x : -x;
      this.startBasePair += delta;
    } else if (e.key === '=' || e.key === 'ArrowUp') {
      const startCenter = this.startBasePair + this.basePairsPerPixel * this.windowSize[0] / 2.0;
      this.basePairsPerPixel /= 1.2;
    } else if (e.key === '-' || e.key === 'ArrowDown') {
      this.basePairsPerPixel *= 1.2;
    }
  }

  handleKeyup(e) {
    if (e.key === 'Alt') {
      this.selectEnabled = false;
    } else if (e.key === 'Control') {
      this.zoomEnabled = false;
    } else if (e.key === 'Shift') {
      this.modifySingleTrack = false;
    }
  }

  handleLoad() {
    // TODO: need to extract dom-elem without hardcoded ID
    const domElem = document.querySelector('#webgl-canvas');
    
    this.renderContext = Util.newRenderContext(domElem);
    this.shaders = TrackView.initializeShaders(this.renderContext);

    domElem.addEventListener('wheel', this.handleMouse.bind(this));
    domElem.addEventListener('mousemove', this.handleMouseMove.bind(this));
    domElem.addEventListener('mousedown', this.handleMouseDown.bind(this));
    domElem.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('keydown', this.handleKeydown.bind(this));
    document.addEventListener('keyup', this.handleKeyup.bind(this));

    const renderFrame = () => {
      this.renderGL();
      requestAnimationFrame(renderFrame);
    };
    renderFrame();
  }


  glContext() {
    return this.renderContext.gl;
  }

  updateViews(event) {
    const newViews = {};
    let idx = 0;
    this.tracks = event.sender.tracks;
    event.sender.tracks.forEach(track => {
      if (!this.views[track.guid]) {
        newViews[track.guid] = new TrackView(track.guid, this.props.model);
        newViews[track.guid].setHeight(0.1);
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
      idx += 1;
    });
    this.views = newViews;
  }

  renderGL() {
    const gl = this.glContext();
    gl.clear(gl.COLOR_BUFFER_BIT);
    const windowState = this.getWindowState();
    const viewGuids = _.keys(this.views);
    const numTracks = viewGuids.length;
    const padding = TRACK_PADDING_PX / windowState.windowSize[1];
    this.hoverEnabled = false;
    this.hoverElement = null;
    let currOffset = padding;
    for (let i = 0; i < numTracks; i++) {
      // setup track position
      const track = this.views[viewGuids[i]];
      track.setYOffset(currOffset + this.trackOffset);
      currOffset += track.getHeight() + padding;
      track.render(this.renderContext, this.shaders, windowState);
      if (track.hoverEnabled && !this.hoverEnabled) {
        this.hoverEnabled = true;
        this.hoverElement = track.hoverElement;
      }
    }
    this.forceUpdate();
  }

  render() {
    const headers = [];
    const backgrounds = [];
    const viewGuids = _.keys(this.views);
    const numTracks = viewGuids.length;
    const windowState = this.getWindowState();
    for (let i = 0; i < numTracks; i++) {
      const track = this.views[viewGuids[i]];
      headers.push(track.getHeader(windowState));
      backgrounds.push(track.getBackground(windowState));
    }
    const width = windowState.windowSize ? windowState.windowSize[0] : 0;
    const endBasePair = width ? Util.endBasePair(windowState.startBasePair, windowState.basePairsPerPixel, windowState.windowSize) : 0;
    const xScale = d3.scaleLinear().range([0, width]).domain([windowState.startBasePair, endBasePair]);
    const xAxis = d3.axisTop()
                    .scale(xScale)
                    .tickSizeOuter(-10)
                    .ticks(Math.floor(width/TICK_SPACING_PIXELS))
                    .tickFormat(Util.roundToHumanReadable);

    let tooltip = (<div />);
    if (this.lastDragCoord && !this.selectEnabled) {
      const coord = this.lastDragCoord.slice();
      const trackInfo = this.getTrackInfoAtCoordinate(coord);
      const x = ANNOTATION_OFFSET + Util.pixelForBasePair(trackInfo.basePair, this.startBasePair, this.basePairsPerPixel, this.windowSize);
      
      if (trackInfo.track !== null && trackInfo.tooltip !== null) {
        const y = (-trackInfo.tooltip.positionNormalized + 0.5) * trackInfo.trackHeightPx + trackInfo.trackCenterPx;
        const basePair = trackInfo.basePair + trackInfo.basePairOffset;
        const values = trackInfo.tooltip.values;
        tooltip = (<TrackToolTip x={x} y={y} colors={trackInfo.tooltip.colors} basePair={basePair} values={values} />);
      }
    }
    const onDrop = this.onDrop;
    const onDragOver = this.onDragOver;
    const onDragLeave = this.onDragLeave;
    const onDoubleClick = this.onDoubleClick;

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
        <div className="track-header-axis">
          <svg className="x-axis-container">
            <g className="x-axis" ref={node => d3.select(node).call(xAxis)} />
          </svg>
        </div>
        <canvas 
          id="webgl-canvas" 
          className={this.getClass()} 
          onDragOver={onDragOver} 
          onDrop={onDrop} 
          onDragLeave={onDragLeave} 
          onDoubleClick={onDoubleClick}
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
};

export default MultiTrackViewer;
