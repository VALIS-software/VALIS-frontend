// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';
// Styles
import './TrackHeader.scss';

const d3 = require('d3');

class TrackHeader extends Component {
  getStyle() {
    return {
      transform: `translate(0px, ${this.props.top}px)`,
      height: Math.ceil(this.props.height) + 'px',
    };
  }

  render() {
    const yScale = d3.scaleLinear().range([0, this.props.height]).domain([0, 100]);
    const yAxis = d3.axisLeft()
                    .scale(yScale)
                    .tickSizeOuter(-10)
                    .ticks(Math.floor(this.props.height/15.0));
    const title = this.props.track.getTitle();
    const style = this.getStyle();
    const height = this.props.height + 'px';
    return (<div style={style} className="track-header">
      <div className="track-header-contents">
        <div className="inner">
          {title}
        </div>
      </div>
      <div className="track-header-axis">
        <svg className="y-axis-container" height={height}>
          <g className="yAxis" ref={node => d3.select(node).call(yAxis)} />
        </svg>
      </div>
      <div className="clear" />
    </div>);
  }
}

TrackHeader.propTypes = {
   top: PropTypes.number,
   height: PropTypes.number,
   track: PropTypes.object,
};

export default TrackHeader;
