// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';
// Styles
import './TrackHeader.scss';

class TrackHeader extends Component {
  getStyle() {
    return {
      transform: `translate(0px, ${this.props.top}px)`,
      height: this.props.height + 'px',
    };
  }

  render() {
    const title = this.props.track.getTitle();
    const style = this.getStyle();
    return (<div style={style} className="track-header">
      <div className="track-header-contents">
        {title}
      </div>
    </div>);
  }
}

TrackHeader.propTypes = {
   top: PropTypes.number,
   height: PropTypes.number,
   track: PropTypes.object,
};

export default TrackHeader;
