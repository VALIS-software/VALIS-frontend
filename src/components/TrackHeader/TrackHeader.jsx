// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';
// Styles
import './TrackHeader.scss';

const d3 = require('d3');

const TICK_SPACING_PIXELS = 15.0;

class TrackHeader extends Component {
  getStyle() {
    return {
      transform: `translate(0px, ${this.props.top}px)`,
      height: Math.ceil(this.props.height) + 'px',
    };
  }

  renderAxis() {
    const height = this.props.height + 'px';
    if (this.props.max === null || this.props.min === null) {
      return (<div  height={height} className="empty-track-header-axis" />);
    }
    const min = this.props.min;
    const max = this.props.max;
    const yScale = d3.scaleLinear().range([0, this.props.height]).domain([max, min]);
    const yAxis = d3.axisLeft()
                    .scale(yScale)
                    .tickSizeOuter(-10)
                    .ticks(Math.floor(this.props.height/TICK_SPACING_PIXELS));
    
    return (<div className="track-header-axis">
      <svg className="y-axis-container" height={height}>
        <g className="yAxis" ref={node => d3.select(node).call(yAxis)} />
      </svg>
    </div>);
  }

  render() {
    const title = this.props.title;
    const style = this.getStyle();
    const axis = this.renderAxis();
    const height = this.props.height + 'px';
    return (<div style={style} className="track-header">
      <div className="track-header-contents">
        <div className="inner">
          {title}
        </div>
      </div>
      {axis}
      <div className="clear" />
    </div>);
  }
}

TrackHeader.propTypes = {
   top: PropTypes.number,
   height: PropTypes.number,
   min: PropTypes.number,
   max: PropTypes.number,
   title: PropTypes.string,
};

export default TrackHeader;
