// Dependencies
import React from 'react';
import PropTypes from 'prop-types';

// Styles
import './TrackToolTip.scss';


function TrackToolTip(props) {
  const style1 = {
    transform: `translate(${props.x}px, ${props.y}px) translateY(-50%)`,
  };
  const style2 = {
    transform: `translate(${props.x}px, ${props.y}px) translateY(-100%)`,
  };
  return (
    <div className="track-tool-tip">
      <div style={style1} className="track-tool-tip-arrow" />
      <div style={style2} className="track-tool-tip-inner">{props.children}</div>
    </div>
  );
}


TrackToolTip.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
};

export default TrackToolTip;
