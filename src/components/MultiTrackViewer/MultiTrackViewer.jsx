// Dependencies
import React from 'react';

import { Igloo } from '../../../lib/igloojs/igloo.js';

// Styles
import './MultiTrackViewer.scss';

import vertexShader from './project.vert';
import fragmentShader from './render.frag';

const panzoom = require('pan-zoom');

const SELECT_MODE_REGIONS = 'regions';
const SELECT_MODE_TRACKS = 'tracks';
const SELECT_MODE_NONE = 'none';


const GENOME_LENGTH = 3000000000;


class MultiTrackViewer extends React.Component {
  constructor(props) {
    super(props);
    this.handleLoad = this.handleLoad.bind(this);
    // NOTE: these are not stored in the react state since
    // they are updated via webGL in the render loop.
    // should probably fix this
    this.trackHeight = 0.1;
    this.pan = [0.0, 0.0];
    this.windowSize = [0.0, 0.0];
    this.selectMode = SELECT_MODE_NONE;
    this.bpPerPixel = 1.0;
    this.state = {
      panPossible: false,
      panning: false,
    };
  }

  componentDidMount() {
    // TODO: Need to write componentDidUnmount
    // that handles destruction of WebGL Context when the page changes
    window.addEventListener('load', this.handleLoad);
    const domElem = document.querySelector('#webgl-canvas');
    this.windowSize = [domElem.clientWidth, domElem.clientHeight];
    this.bpPerPixel = GENOME_LENGTH / (this.windowSize[0]);
  }

  getClass() {
    if (this.state.panning) {
      return 'pan-active';
    } else if (this.state.panPossible) {
      return 'pannable';  
    } else {
      return '';
    }
  }

  startBasePair() {
    return -this.pan[0] * this.bpPerPixel;
  }

  endBasePair() {
    return (-this.pan[0] + this.windowSize[0]) * this.bpPerPixel;
  }
  
  screenXValueToBasePair(x) {
    return (x / this.windowSize[0]) * (this.endBasePair() - this.startBasePair());
  }

  screenYValueToTrack(y) {
    return 0;
  }

  handleMouse(e) {
    if (this.selectMode === SELECT_MODE_REGIONS) {
      // select a region of the x axis
      this.selectionEnd = this.screenXValueToBasePair(e.x);
      console.log(this.selectionStart);
      console.log(this.selectionEnd);
    } else if (this.selectMode === SELECT_MODE_TRACKS) {
      // select a set of tracks along the y axis
      if (this.startSelectPos) {
        this.currentSelection = [0.0, this.startSelectPos[1], -1.0, this.startSelectPos[1]];
      } else {
        this.currentSelection = [0.0, 0.0, 0.0, 0.0];
      }
    } else if (this.state.panPossible) {
      // x pan sets the base pair!
      this.pan = [Math.min(0.0, this.pan[0] + e.dx), Math.min(0.0, this.pan[1] + e.dy)];
      this.setState({
        panning: true,
      });
    } else {
      this.setState({
        panning: false,
      });
    }

    if (this.bpPerPixel <= GENOME_LENGTH / (this.windowSize[0])) {
      this.bpPerPixel /= 1.0 - (e.dz / 1000.0);  
      this.bpPerPixel = Math.min(GENOME_LENGTH / (this.windowSize[0]), this.bpPerPixel);
    }

    // if (this.) {
    //   this.trackHeight *= 1.0 - (e.dz / 1000.0);
    // }
  }

  handleMouseDown(e) {
    if (this.state.panPossible) {
      this.selectMode = SELECT_MODE_NONE;
    } else {
      this.selectionStart = this.screenXValueToBasePair(e.clientX);  
    }
  }

  handleMouseUp(e) {
    this.startSelectPos = null;
    this.setState({
      panning: false,
    });
  }

  handleKeydown(e) {
    if (e.key === 'Meta') {
      this.setState({
        panPossible: true,
      });
    }
    this.startSelectPos = null;
  }

  handleKeyup(e) {
    this.startSelectPos = null;
    if (e.key === 'Meta') {
      this.setState({
        panning: false,
        panPossible: false,
      });
    }
  }


  handleLoad() {
    // TODO: need to extract dom-elem without hardcoded ID
    const domElem = document.querySelector('#webgl-canvas');
    const igloo = this.igloo = new Igloo(domElem);
    this.quad = igloo.array(Igloo.QUAD2);

    panzoom(domElem, this.handleMouse.bind(this));
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
    for (let i = 0; i < 10; i++) {
      this.program.use()
        .uniform('color', [i / 10.0, i / 20.0, 1.0])
        .uniform('pan', this.pan)
        .uniform('windowSize', this.windowSize)
        .uniform('trackHeight', this.trackHeight)
        .uniform('displayedRange', [this.startBasePair(), this.endBasePair()])
        .uniform('totalRange', [0, GENOME_LENGTH])
        .uniform('offset', [0, i * this.trackHeight])
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
