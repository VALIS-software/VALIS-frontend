// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Util from '../../helpers/util.js';

// Styles
import './TrackHeader.scss';

const d3 = require('d3');

const TICK_SPACING_PIXELS = 15.0;

class TrackHeader extends Component {
  constructor(props) {
    super(props);
    this.onDragStart = this.onDragStart.bind(this);
    this.onDragOver = this.onDragOver.bind(this);
    this.onDragLeave = this.onDragLeave.bind(this);
    this.onDrop = this.onDrop.bind(this);
    this.onDragStart = this.onDragStart.bind(this);
  }

  componentDidMount() {
    this.setState({
      borderTop: false,
    });
  }

  onDragStart(evt) {
    evt.dataTransfer.setData('guid', this.props.guid);
    evt.dataTransfer.effectAllowed = 'all';
  }

  onDragOver(evt) {
    this.setState({
      borderTop: true,
    });
    evt.dataTransfer.dropEffect = 'move';
    evt.preventDefault();
  }

  onDragLeave(evt) {
    this.setState({
      borderTop: false,
    });
  }

  onDrop(evt) {
    this.setState({
      borderTop: false,
    });
    const toIdx = this.props.appModel.indexOfTrack(this.props.guid);
    this.props.appModel.moveTrack(evt.dataTransfer.getData('guid'), toIdx);
  }

  getStyle() {
    if (!this.state) return {};
    const border = this.state.borderTop ? '2px solid red' : 'none';
    const delta = this.state.borderTop ? -1 : 0;
    return {
      borderTop: border,
      transform: `translate(0px, ${this.props.top}px)`,
      height: Math.ceil(this.props.height + delta) + 'px',
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
    const onDragOver = this.onDragOver;
    const onDragLeave = this.onDragLeave;
    const onDrop = this.onDrop;
    const onDragStart = this.onDragStart;
    const bpStr = (this.props.offset > 0 ? '+' : '-') + Util.roundToHumanReadable(this.props.offset) + ' bp';
    const offset = this.props.offset !== 0.0 ? bpStr : '';

    return (<div style={style} className="track-header">
      <div 
        className="track-header-contents"
        draggable="true"
        onDragStart={onDragStart} 
        onDrop={onDrop} 
        onDragLeave={onDragLeave} 
        onDragOver={onDragOver}
      >
        <div className="inner">
          {title}
          <br />
          <span className="bp-offset"> {offset} </span>
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
   offset: PropTypes.number,
   appModel: PropTypes.object,
   guid: PropTypes.string,
};

export default TrackHeader;
