// Dependencies
import * as React from "react";
import Util from "../../helpers/util.js";
import {
  CHROMOSOME_START_BASE_PAIRS,
  GENOME_LENGTH
} from "../../helpers/constants.js";

const _ = require("underscore");
const d3 = require("d3");

const TICK_SPACING_PIXELS = 100.0;
const SHOW_CHROMOSOMES_THRESHOLD = 350000000.0;

// Styles
import "./XAxis.scss";

interface Props {
  viewModel: any;
}

class XAxis extends React.Component<Props, any> {
  renderBasePair = (d: any) => {
    const relativeBp = Util.chromosomeRelativeBasePair(d);
    if (relativeBp) {
      return Util.roundToHumanReadable(relativeBp.basePair);
    }
    return "";
  };

  renderChromosome = (d: any) => {
    for (let i = 0; i < CHROMOSOME_START_BASE_PAIRS.length; i++) {
      if (d <= CHROMOSOME_START_BASE_PAIRS[i]) {
        return "c" + Util.chromosomeIndexToName(i);
      }
    }
    return "";
  };

  render() {
    if (!this.props.viewModel) {
      return <div />;
    }
    const windowState = this.props.viewModel.getViewState();
    const width = windowState.windowSize ? windowState.windowSize[0] : 0;
    const endBasePair = width
      ? Util.endBasePair(
          windowState.startBasePair,
          windowState.basePairsPerPixel,
          windowState.windowSize
        )
      : 0;

    const xScale = d3
      .scaleLinear()
      .range([0, width])
      .domain([windowState.startBasePair, endBasePair]);
    let xAxis = d3
      .axisTop()
      .scale(xScale)
      .tickSizeOuter(-10)
      .ticks(Math.floor(width / TICK_SPACING_PIXELS))
      .tickFormat(this.renderBasePair);

    let indicatorText = "";

    if (endBasePair - windowState.startBasePair > SHOW_CHROMOSOMES_THRESHOLD) {
      const ticks = _.filter(CHROMOSOME_START_BASE_PAIRS, (d: any) => {
        return d >= windowState.startBasePair && d <= endBasePair;
      });
      xAxis = d3
        .axisTop()
        .scale(xScale)
        .tickSizeOuter(-10)
        .tickValues(ticks)
        .tickFormat(this.renderChromosome);
    } else if (endBasePair > windowState.startBasePair) {
      // validate active range
      let centerBasePair = (windowState.startBasePair + endBasePair) * 0.5;
      centerBasePair = Math.max(centerBasePair, 0);
      centerBasePair = Math.min(centerBasePair, GENOME_LENGTH);

      // test if chromosomes are visible
      const outOfBounds =
        endBasePair < 0 || windowState.startBasePair > GENOME_LENGTH;
      const centerChromosome = outOfBounds
        ? null
        : Util.chromosomeIndex(centerBasePair);

      if (centerChromosome != null) {
        indicatorText = `chromosome ${Util.chromosomeIndexToName(
          centerChromosome
        )}`;
      }
    }

    return (
      <div className="track-header-axis">
        <div className="x-axis-indicator">
          <div className="indicator-content">{indicatorText}</div>
        </div>
        <svg className="x-axis-container">
          <g className="x-axis" ref={node => d3.select(node).call(xAxis)} />
        </svg>
      </div>
    );
  }
}

export default XAxis;
