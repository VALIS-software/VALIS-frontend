// Dependencies
import React from 'react';

import { Igloo } from '../../../lib/igloojs/igloo.js';

// Styles
import './Content.scss';

import vertexShader from './project.vert';
import fragmentShader from './render.frag';

const panzoom = require('pan-zoom');

class Content extends React.Component {
  constructor(props) {
    super(props);
    console.log(props);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleLoad = this.handleLoad.bind(this);
    this.handleMouse = this.handleMouse.bind(this);
    // NOTE: this are not stored in the react state since
    // they are updated via webGL in the render loop.
    this.zoom = [1.0, 1.0];
    this.pan = [0.0, 0.0];
    this.size = [1.0, 1.0];
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
    this.pan = [this.pan[0] + e.dx, this.pan[1] + e.dy];
    const scale = 1.0 - (e.dz / 1000.0);
    this.zoom = [scale * this.zoom[0], scale * this.zoom[1]];
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
    const tint = [Math.sin(this.tick / 13), Math.cos(this.tick / 19), 0];
    // this.image.bind(0);  // active texture 0
    this.program.use()
      .uniform('tint', tint)
      .uniform('pan', this.pan)
      .uniform('size', this.size)
      .uniform('zoom', this.zoom)
      .attrib('points', this.quad, 2)
      .draw(this.igloo.gl.TRIANGLE_STRIP, Igloo.QUAD2.length / 2);
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

export default Content;
