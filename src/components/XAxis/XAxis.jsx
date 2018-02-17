// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Util from '../../helpers/util.js';
import DropDownMenu from 'material-ui/DropDownMenu';
import MenuItem from 'material-ui/MenuItem';
import { CHROMOSOME_START_BASE_PAIRS } from '../../helpers/constants.js';

const _ = require('underscore');
const d3 = require('d3');

const TICK_SPACING_PIXELS = 100.0;
const SHOW_CHROMOSOMES_THRESHOLD = 350000000.0;

// Styles
import './XAxis.scss';

class XAxis extends React.Component {

  constructor(props) {
    super(props);
    this.renderBasePair = this.renderBasePair.bind(this);
    this.renderChromosome = this.renderChromosome.bind(this);
  }

  renderBasePair(d) {
    const relativeBp = Util.rawBasePairToChromosomeBasePair(d);
    if (relativeBp) {
      return Util.roundToHumanReadable(relativeBp.basePair);
    }
  }


  renderChromosome(d) {
    for (let i = 0; i < CHROMOSOME_START_BASE_PAIRS.length; i++) {
      if (d <= CHROMOSOME_START_BASE_PAIRS[i]) return 'c' + Util.chromosomeIndexToName(i);
    }
  }

  render() {
    if (!this.props.viewModel) return (<div />);
    const windowState = this.props.viewModel.getViewState();
    const width = windowState.windowSize ? windowState.windowSize[0] : 0;
    const endBasePair = width ? Util.endBasePair(windowState.startBasePair, windowState.basePairsPerPixel, windowState.windowSize) : 0;

    const xScale = d3.scaleLinear().range([0, width]).domain([windowState.startBasePair, endBasePair]);
    let xAxis = d3.axisTop()
                  .scale(xScale)
                  .tickSizeOuter(-10)
                  .ticks(Math.floor(width/TICK_SPACING_PIXELS))
                  .tickFormat(this.renderBasePair);

    if ((endBasePair - windowState.startBasePair) > SHOW_CHROMOSOMES_THRESHOLD) {
      const ticks = _.filter(CHROMOSOME_START_BASE_PAIRS, d => {
        return d >= windowState.startBasePair && d <= endBasePair;
      });
      xAxis = d3.axisTop()
                .scale(xScale)
                .tickSizeOuter(-10)
                .tickValues(ticks)
                .tickFormat(this.renderChromosome);
    }

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
