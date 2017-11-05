// Dependencies
import React from 'react';

import { Igloo } from '../../../lib/igloojs/igloo.js';

// Styles
import './Content.scss';

import vertexShader from './project.vert';
import fragmentShader from './render.frag';

class Content extends React.Component {
  constructor(props) {
    super(props);
    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleLoad = this.handleLoad.bind(this);
    this.state = {
      input: 'World',
    };
  }

  componentDidMount() {
    // TODO: Need to write componentDidUnmount
    // that handles destruction of WebGL Context when the page changes
    window.addEventListener('load', this.handleLoad);
  }

  handleLoad() {
    // TODO: need to extract dom-elem without hardcoded ID
    const igloo = this.igloo = new Igloo(document.querySelector('#webgl-canvas'));
    this.quad = igloo.array(Igloo.QUAD2);
    // this.image   = igloo.texture($('#image')[0]);


    this.program = igloo.program(vertexShader, fragmentShader);
    this.tick = 0;
    const renderFrame = () => {
      console.log('Rendering frame');
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
      .uniformi('image', 0)
      .attrib('points', this.quad, 2)
      .draw(this.igloo.gl.TRIANGLE_STRIP, Igloo.QUAD2.length / 2);
    this.tick++;
  }

  render() {
    return (
      <div className="content">
        <canvas width="512" height="256" id="webgl-canvas" />
      </div>
    );
  }
}

export default Content;
