// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Util from '../../helpers/util.js';
import { GENOME_LENGTH } from '../../helpers/constants.js';

const _ = require('underscore');
const d3 = require('d3');

const TICK_SPACING_PIXELS = 100.0;

class XAxis extends React.Component {

  componentDidMount() {
    // TODO: add listeners to view model
  }

  render() {
    if (!this.props.viewModel) return (<div />);
    const windowState = this.props.viewModel.getViewState();
    const width = windowState.windowSize ? windowState.windowSize[0] : 0;
    const endBasePair = width ? Util.endBasePair(windowState.startBasePair, windowState.basePairsPerPixel, windowState.windowSize) : 0;
    const xScale = d3.scaleLinear().range([0, width]).domain([windowState.startBasePair, endBasePair]);
    const xAxis = d3.axisTop()
                    .scale(xScale)
                    .tickSizeOuter(-10)
                    .ticks(Math.floor(width/TICK_SPACING_PIXELS))
                    .tickFormat(Util.roundToHumanReadable);

    return (<div className="track-header-axis">
      <svg className="x-axis-container">
        <g className="x-axis" ref={node => d3.select(node).call(xAxis)} />
      </svg>
    </div>);
  }
}
XAxis.propTypes = {
  viewModel: PropTypes.object,
};

export default XAxis;
