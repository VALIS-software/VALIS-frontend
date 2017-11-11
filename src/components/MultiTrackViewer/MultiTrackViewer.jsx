// Dependencies
import React from 'react';

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
    this.setState({
      windowSize: [domElem.clientWidth, domElem.clientHeight],
      basePairsPerPixel: GENOME_LENGTH / domElem.clientWidth,
      selectMode: SELECT_MODE_NONE,
      trackHeight: 0.1,
      startBasePair: 0,
    });
  }

  getClass() {
    return '';
  }

  startBasePair() {
    return this.state.startBasePair;
  }

  endBasePair() {
    return this.state.startBasePair + this.state.basePairsPerPixel * this.state.windowSize[0];
  }

  basePairForScreenX(x) {
    const u = x / this.state.windowSize[0];
    return this.startBasePair() + u * (this.endBasePair() - this.startBasePair());
  }

  handleMouse(e) {
    if (this.state.basePairsPerPixel <= GENOME_LENGTH / (this.state.windowSize[0])) {
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
          
          const rawPixelsBefore = lastBp / this.state.basePairsPerPixel;
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
  }

  handleMouseUp(e) {
    this.startSelectPos = null;
  }

  handleKeydown(e) {
    if (e.key === 'Meta') {
    }
    this.startSelectPos = null;
  }

  handleKeyup(e) {
    this.startSelectPos = null;
    if (e.key === 'Meta') {
    }
  }


  handleLoad() {
    // TODO: need to extract dom-elem without hardcoded ID
    const domElem = document.querySelector('#webgl-canvas');
    const igloo = this.igloo = new Igloo(domElem);
    this.quad = igloo.array(Igloo.QUAD2);

    domElem.addEventListener('wheel', this.handleMouse.bind(this));
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
        .uniform('windowSize', this.state.windowSize)
        .uniform('trackHeight', this.state.trackHeight)
        .uniform('displayedRange', [this.startBasePair(), this.endBasePair()])
        .uniform('totalRange', [0, GENOME_LENGTH])
        .uniform('offset', [0, 1.25 * i * this.state.trackHeight])
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
