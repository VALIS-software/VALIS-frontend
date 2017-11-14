// Dependencies
import React from 'react';

import GenomeAPI from '../../models/api.js';
import Track from '../../models/track.js';

import { Igloo } from '../../../lib/igloojs/igloo.js';

// Styles
import './MultiTrackViewer.scss';

import vertexShader from './project.vert';
import fragmentShader from './render.frag';

const SELECT_MODE_REGIONS = 'regions';
const SELECT_MODE_TRACKS = 'tracks';
const SELECT_MODE_NONE = 'none';


const GENOME_LENGTH = 3000000000;


class MultiTrackViewer extends React.Component {
  constructor(props) {
    super(props);
    this.handleLoad = this.handleLoad.bind(this);
  }

  componentDidMount() {
    // TODO: Need to write componentDidUnmount
    // that handles destruction of WebGL Context when the page changes
    window.addEventListener('load', this.handleLoad);
    const domElem = document.querySelector('#webgl-canvas');

    // need to reset explicit canvas dims to prevent canvas stretch scaling
    domElem.width = domElem.clientWidth;
    domElem.height = domElem.clientHeight;

    this.setState({
      windowSize: [domElem.clientWidth, domElem.clientHeight],
      basePairsPerPixel: GENOME_LENGTH / domElem.clientWidth,
      selectMode: SELECT_MODE_NONE,
      trackHeight: 0.1,
      trackOffset: 0.0,
      startBasePair: 0,
      zoomEnabled: false,
      dragEnabled: false,
      tracks: [],
      lastDragCoord: null,
      currentDataRange: null,
      currentDataResolution: null,
    }); 
    this.numTilesLoading = 0;

    this.api = new GenomeAPI('http://localhost:5000');
    // load test track:
    this.api.getTrack('genome1', 'genome1.1').then(this.addTrack.bind(this));
    this.api.getTrack('genome1', 'genome1.2').then(this.addTrack.bind(this));
    this.api.getTrack('genome1', 'genome1.3').then(this.addTrack.bind(this));
  }

  addTrack(track) {
    const newTrackList = [];
    this.state.tracks.forEach(oldTrack => {
      newTrackList.push(oldTrack);
    });
    newTrackList.push(track);
    this.setState({
      tracks: newTrackList,
    });
  }

  componentDidUpdate(prevProps, prevState) {
    this.loadDataIfNeeded();
  }


  loadDataIfNeeded() {
    // skip if we are loading or initializing
    if (!this.state || this.state.tracks.length === 0 || this.numTilesLoading > 0) return;
    
    // TODO: need to cancel old requests!

    let fetchNeeded = false;
    if (this.state.currentDataResolution === null || this.state.currentDataRange === null) {
      // no data has loaded!
      fetchNeeded = true;
    } else if (this.state.basePairsPerPixel < this.state.currentDataResolution) {
      // we've zoomed in (need higher resolution data)
      fetchNeeded = true;
    } else if (this.state.currentDataRange[0] > this.startBasePair() || this.state.currentDataRange[1] < this.endBasePair()) {
      // the range has changed
      fetchNeeded = true;
    }

    if (fetchNeeded) {
      this.state.tracks.forEach(track => {
        const fetch = track.loadData(this.startBasePair(), this.endBasePair(), this.state.basePairsPerPixel);
        console.log('fetch', this.startBasePair(), this.endBasePair(), this.state.basePairsPerPixel);
        console.log('sent', fetch);
        this.setState({
          currentDataResolution: fetch.samplingRate,
          currentDataRange: [fetch.startBp, fetch.endBp],
        });

        this.numTilesLoading = fetch.promises.length;

        // TODO: Need to handle failure conditions when one or more of the promises fail.
        // we should have a mechanism that resets currentDataResolution, currentDataRange
        // to null and tries again.
        fetch.promises.forEach(promise => {
          promise.then(data => {
            console.log('received', data);
            this.updateTile(data);
            this.numTilesLoading--;
            if (this.numTilesLoading === 0) {
              // all promises loaded
            }
          });
        });
      });
    }
  }

  getClass() {
    const classes = [];
    if (this.state === null) {
      return '';
    }

    if (this.state.zoomEnabled) {
      classes.push('zoom-active');
    }

    if (this.state.dragEnabled) {
      classes.push('drag-active');
    }

    return classes.join(' ');
  }


  updateTile(data) {
    
  }

  startBasePair() {
    return this.state.startBasePair;
  }

  endBasePair() {
    return this.state.startBasePair + (this.state.basePairsPerPixel * this.state.windowSize[0]);
  }

  basePairForScreenX(x) {
    const u = x / this.state.windowSize[0];
    return this.startBasePair() + (u * (this.endBasePair() - this.startBasePair()));
  }

  trackOffsetForScreenY(y) { 
    const totalH = (this.state.tracks.length * this.state.trackHeight) * this.state.windowSize[1];
    return (y - (this.state.trackOffset * this.state.windowSize[1])) / totalH;
  }

  handleMouseMove(e) {
    if (this.state.dragEnabled) {
      const deltaX = e.clientX - this.state.lastDragCoord[0];
      const deltaY = e.clientY - this.state.lastDragCoord[1];
      if (Math.abs(deltaY) > 0) {
        const delta = this.state.trackOffset + deltaY / this.state.windowSize[1];
        this.setState({
          trackOffset: delta,
        });
      }

      if (Math.abs(deltaX) > 0) {
        this.setState({
          startBasePair: this.state.startBasePair - deltaX * this.state.basePairsPerPixel,
        });
      }
    }

    this.setState({
      lastDragCoord: [e.clientX, e.clientY],
    });
  }

  handleMouse(e) {
    if (this.state.dragEnabled) {
      return;
    } else if (this.state.zoomEnabled) {
      if (Math.abs(e.deltaY) > 0) {
          const lastTrackOffset = this.trackOffsetForScreenY(e.clientY);
          
          const trackHeight = this.state.trackHeight / (1.0 - (e.deltaY / this.state.windowSize[1]));  
          
          this.setState({
            trackHeight: trackHeight,
          });
          // compute the offset so that the y position remains constant after zoom:
          const totalH = (this.state.tracks.length * this.state.trackHeight) * this.state.windowSize[1];
          const offset = (e.clientY - (lastTrackOffset * totalH)) / this.state.windowSize[1];
          this.setState({
            trackOffset: offset,
          });
        }
    } else if (this.state.basePairsPerPixel <= GENOME_LENGTH / (this.state.windowSize[0])) {
      // x pan sets the base pair!
      if (Math.abs(e.deltaX) > 0) {
        const newStart = this.state.startBasePair + (e.deltaX * this.state.basePairsPerPixel);
        this.setState({
          startBasePair: newStart,
          panning: true,
        });
      } else {
        this.setState({
          panning: false,
        });
        if (Math.abs(e.deltaY) > 0) {
          const lastBp = this.basePairForScreenX(e.clientX);
          
          let newBpPerPixel = this.state.basePairsPerPixel / (1.0 - (e.deltaY / 1000.0));  
          newBpPerPixel = Math.min(GENOME_LENGTH / (this.state.windowSize[0]), newBpPerPixel);

          // compute the new startBasePair so that the cursor remains
          // centered on the same base pair after scaling:
          const rawPixelsAfter = lastBp / newBpPerPixel;
          const offset = (rawPixelsAfter - e.clientX) * newBpPerPixel;
          this.setState({
            startBasePair:  offset,
            basePairsPerPixel: newBpPerPixel,
          });
        }
      }
    }
  }

  handleMouseDown(e) {
    this.setState({
      dragEnabled: true,
      lastDragCoord: [e.clientX, e.clientY],
    });
  }

  handleMouseUp(e) {
    this.setState({
      dragEnabled: false,
      lastDragCoord: null,
    });
  }

  handleKeydown(e) {
    if (e.key === 'Meta') {
      this.setState({
        zoomEnabled: true,
      });
    }
  }

  handleKeyup(e) {
    if (e.key === 'Meta') {
      this.setState({
        zoomEnabled: false,
      });
    }
  }


  handleLoad() {
    // TODO: need to extract dom-elem without hardcoded ID
    const domElem = document.querySelector('#webgl-canvas');
    const igloo = this.igloo = new Igloo(domElem);
    this.quad = igloo.array(Igloo.QUAD2);

    domElem.addEventListener('wheel', this.handleMouse.bind(this));
    domElem.addEventListener('mousemove', this.handleMouseMove.bind(this));
    domElem.addEventListener('mousedown', this.handleMouseDown.bind(this));
    domElem.addEventListener('mouseup', this.handleMouseUp.bind(this));
    document.addEventListener('keydown', this.handleKeydown.bind(this));
    document.addEventListener('keyup', this.handleKeyup.bind(this));

    this.program = igloo.program(vertexShader, fragmentShader);
    this.tick = 0;
    const renderFrame = () => {
      this.renderGL();
      requestAnimationFrame(renderFrame);
    };
    renderFrame();
  }

  handleInputChange(e) {
    this.setState({ input: e.target.value });
  }

  renderGL() {
    const numTracks = this.state.tracks.length;
    for (let i = 0; i < numTracks; i++) {
      this.program.use()
        .uniform('color', [i / numTracks, i / (numTracks * 2.0), 1.0])
        .uniform('windowSize', this.state.windowSize)
        .uniform('trackHeight', this.state.trackHeight)
        .uniform('displayedRange', [this.startBasePair(), this.endBasePair()])
        .uniform('totalRange', [0, GENOME_LENGTH])
        .uniform('offset', [0, i * this.state.trackHeight + this.state.trackOffset])
        .attrib('points', this.quad, 2)
        .draw(this.igloo.gl.TRIANGLE_STRIP, Igloo.QUAD2.length / 2);
    }
    this.tick++;
  }

  render() {
    return (
      <div className="content">
        <canvas id="webgl-canvas" className={this.getClass()} />
      </div>
    );
  }
}

export default MultiTrackViewer;
