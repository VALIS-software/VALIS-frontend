// Dependencies
import React from 'react';
import { Igloo } from '../../../lib/igloojs/igloo.js';

import GenomeAPI from '../../models/api.js';
import Track from '../../models/track.js';
import Annotation from '../Annotation/Annotation.jsx';

// Styles
import './MultiTrackViewer.scss';

import vertexShader from './project.vert';
import fragmentShader from './render.frag';

const SELECT_MODE_REGIONS = 'regions';
const SELECT_MODE_TRACKS = 'tracks';
const SELECT_MODE_NONE = 'none';


const GENOME_LENGTH = 3000000000;
const MAX_TEXTURES = 128;

class MultiTrackViewer extends React.Component {
  constructor(props) {
    super(props);
    this.handleLoad = this.handleLoad.bind(this);
    this.textures = [];
    this.overlayElem = null;
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

    this.setState({
      windowSize: [domElem.clientWidth, domElem.clientHeight],
      basePairsPerPixel: GENOME_LENGTH / domElem.clientWidth,
      selectMode: SELECT_MODE_NONE,
      selectEnabled: false,
      trackHeight: 0.1,
      trackOffset: 0.0,
      startBasePair: 0,
      zoomEnabled: false,
      dragEnabled: false,
      tracks: [],
      lastDragCoord: null,
      startDragCoord: null,
    }); 
    this.numTilesLoading = 0;

    this.api = new GenomeAPI('http://localhost:5000');
    // load test track:
    this.api.getTrack('genome1', 'genome1.1').then(this.addTrack.bind(this));
    this.api.getTrack('genome1', 'genome1.2').then(this.addTrack.bind(this));
    this.api.getTrack('genome1', 'genome1.3').then(this.addTrack.bind(this));
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

    if (this.state.selectEnabled) {
      classes.push('select-active');
    }

    return classes.join(' ');
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

  pixelForBasePair(bp) {
    const u = (bp - this.startBasePair()) / (this.endBasePair() - this.startBasePair());
    return u * this.state.windowSize[0];
  }

  handleMouseMove(e) {
    if (this.state.dragEnabled) {
      if (!this.state.selectEnabled) {
        const deltaX = e.offsetX - this.state.lastDragCoord[0];
        const deltaY = e.offsetY - this.state.lastDragCoord[1];
        if (Math.abs(deltaY) > 0) {
          const delta = Math.min(0.0, this.state.trackOffset + deltaY / this.state.windowSize[1]);
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
    }

    this.setState({
      lastDragCoord: [e.offsetX, e.offsetY],
    });
  }

  handleMouse(e) {
    if (this.state.dragEnabled) {
      return;
    } else if (this.state.zoomEnabled) {
      if (Math.abs(e.deltaY) > 0) {
          const lastTrackOffset = this.trackOffsetForScreenY(e.offsetY);
          
          const trackHeight = this.state.trackHeight / (1.0 - (e.deltaY / this.state.windowSize[1]));  
          
          this.setState({
            trackHeight: trackHeight,
          });
          // compute the offset so that the y position remains constant after zoom:
          const totalH = (this.state.tracks.length * this.state.trackHeight) * this.state.windowSize[1];
          const offset = Math.min(0.0, (e.offsetY - (lastTrackOffset * totalH)) / this.state.windowSize[1]);
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
          const lastBp = this.basePairForScreenX(e.offsetX);
          
          let newBpPerPixel = this.state.basePairsPerPixel / (1.0 - (e.deltaY / 1000.0));  
          newBpPerPixel = Math.min(GENOME_LENGTH / (this.state.windowSize[0]), newBpPerPixel);

          // compute the new startBasePair so that the cursor remains
          // centered on the same base pair after scaling:
          const rawPixelsAfter = lastBp / newBpPerPixel;
          const offset = (rawPixelsAfter - e.offsetX) * newBpPerPixel;
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
      lastDragCoord: [e.offsetX, e.offsetY],
      startDragCoord: [e.offsetX, e.offsetY],
    });
  }

  handleMouseUp(e) {
    this.setState({
      dragEnabled: false,
      lastDragCoord: null,
      startDragCoord: null,
    });
  }

  handleKeydown(e) {
    if (e.key === 'Alt') {
      this.setState({
        selectEnabled: true,
      });
    } else if (e.key === 'Meta') {
      this.setState({
        zoomEnabled: true,
      });
    }
  }

  handleKeyup(e) {
    if (e.key === 'Alt') {
      this.setState({
        selectEnabled: false,
      });
    } else if (e.key === 'Meta') {
      this.setState({
        zoomEnabled: false,
      });
    }
  }


  handleLoad() {
    // TODO: need to extract dom-elem without hardcoded ID
    const domElem = document.querySelector('#webgl-canvas');
    const igloo = this.igloo = new Igloo(domElem);

    // enable floating point textures
    igloo.gl.getExtension('OES_texture_float');

    // setup rendering surface:
    this.quad = igloo.array(Igloo.QUAD2);


    const gl = this.igloo.gl;
    for (let i = 0; i < MAX_TEXTURES; i++) {
      // allocate a new texture
      const newTexture = this.igloo.texture(null, gl.RGBA, gl.CLAMP_TO_EDGE, gl.NEAREST, gl.FLOAT);
      this.textures.push(newTexture);
    }

    this.blankTexture = this.igloo.texture(null, gl.RGBA, gl.CLAMP_TO_EDGE, gl.NEAREST, gl.FLOAT);
    this.blankTexture.blank(1024, 1);

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


  glContext() {
    return this.igloo.gl;
  }

  renderTrack(track, index, numTracks) {
    const tiles = track.getTiles(this.startBasePair(), this.endBasePair(), this.state.basePairsPerPixel);
    let j = 0;
    tiles.forEach(tile => {
        this.textures[j].bind(1 + j);
        this.textures[j].set(tile.tile.data, 1024, 1);
        const shader = this.program.use();
        shader.uniformi('data', 1 + j);
        shader.uniform('tile', 0.5 + 0.5 * j / tiles.length);
        shader.uniform('currentTileDisplayRange', tile.range);
        shader.uniform('totalTileRange', tile.tile.tileRange);
        shader.uniform('color', [index / numTracks, index / (numTracks * 2.0), 1.0]);
        shader.uniform('windowSize', this.state.windowSize);
        shader.uniform('trackHeight', this.state.trackHeight);
        shader.uniform('displayedRange', [this.startBasePair(), this.endBasePair()]);
        shader.uniform('totalRange', [0, GENOME_LENGTH]);
        shader.uniform('offset', [0, index * this.state.trackHeight + this.state.trackOffset]);
        shader.attrib('points', this.quad, 2);

        if (this.state.selectEnabled) {
          const show = this.state.startDragCoord && this.state.lastDragCoord ? 1 : 0;
          shader.uniformi('showSelection', show);
          shader.uniform('selectionBoundsMin', this.state.startDragCoord);
          shader.uniform('selectionBoundsMax', this.state.lastDragCoord);
        }
        shader.draw(this.igloo.gl.TRIANGLE_STRIP, Igloo.QUAD2.length / 2);
        j += 1;
    });
  }

  renderAnnotations(track, index, numTracks) {
    const annotations = track.getAnnotations(this.startBasePair(), this.endBasePair(), this.state.basePairsPerPixel);
    return annotations.map(annotation => {
      // update the overlay elem:
      const start = this.pixelForBasePair(annotation.startBp);
      const end = Math.min(this.state.windowSize[0], this.pixelForBasePair(annotation.endBp));
      const top = (index * this.state.trackHeight + this.state.trackOffset) * this.state.windowSize[1];
      return (<Annotation key={index + annotation.id} left={start} width={end-start} top={top} annotation={annotation} />);
    });
  }

  renderGL() {
    const gl = this.glContext();
    gl.clear(gl.COLOR_BUFFER_BIT);
    const numTracks = this.state.tracks.length;
    for (let i = 0; i < numTracks; i++) {
      const track = this.state.tracks[i];
      this.renderTrack(track, i, numTracks);
    }
    this.tick++;
  }

  render() {
    let annotations = [];
    if (this.state) {
      const numTracks = this.state.tracks.length;
      for (let i = 0; i < numTracks; i++) {
        const track = this.state.tracks[i];
        annotations = annotations.concat(this.renderAnnotations(track, i, numTracks));
      }
    }

    return (
      <div className="content">
        <canvas id="webgl-canvas" className={this.getClass()} />
        <div id="webgl-overlay">
          {annotations}
        </div>
      </div>
    );
  }
}

export default MultiTrackViewer;
