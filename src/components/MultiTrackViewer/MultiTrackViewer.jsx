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

class MultiTrackViewer extends React.Component {
  constructor(props) {
    super(props);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleLoad = this.handleLoad.bind(this);
    this.handleMouse = this.handleMouse.bind(this);
    // NOTE: these are not stored in the react state since
    // they are updated via webGL in the render loop.
    // should probably fix this
    this.zoom = [1.0, 0.1];
    this.pan = [0.0, 0.0];
    this.size = [1.0, 1.0];
    this.selectMode = SELECT_MODE_NONE;
    this.state = {};
  }

  componentDidMount() {
    // TODO: Need to write componentDidUnmount
    // that handles destruction of WebGL Context when the page changes
    window.addEventListener('load', this.handleLoad);
    const domElem = document.querySelector('#webgl-canvas');
    this.size = [domElem.clientWidth, domElem.clientHeight];
  }

  handleMouse(e) {
    if (this.selectMode === SELECT_MODE_REGIONS) {
      // select a region of the x axis
    } else if (this.selectMode === SELECT_MODE_TRACKS) {
      // select a set of tracks along the y axis
    } else {
      // x pan sets the base pair!
      this.pan = [this.pan[0], this.pan[1] + e.dy];
      const scale = 1.0 - (e.dz / 1000.0);
      this.zoom = [scale * this.zoom[0], scale * this.zoom[1]];
    }
  }

  handleLoad() {
    // TODO: need to extract dom-elem without hardcoded ID
    const domElem = document.querySelector('#webgl-canvas');
    const igloo = this.igloo = new Igloo(domElem);
    this.quad = igloo.array(Igloo.QUAD2);
    panzoom(domElem, this.handleMouse);

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
        .uniform('size', this.size)
        .uniform('zoom', this.zoom)
        .uniform('offset', [0, i * this.size[1]])
        .attrib('points', this.quad, 2)
        .draw(this.igloo.gl.TRIANGLE_STRIP, Igloo.QUAD2.length / 2);
    }
    this.tick++;
  }

  render() {
    return (
      <div className="content">
        <canvas id="webgl-canvas" />
      </div>
    );
  }
}

export default MultiTrackViewer;
