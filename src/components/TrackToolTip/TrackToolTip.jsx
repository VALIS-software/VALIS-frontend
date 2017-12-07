// Dependencies
import React from 'react';
import PropTypes from 'prop-types';

// Styles
import './TrackToolTip.scss';


function TrackToolTip(props) {
  const style = {
    transform: `translate(${props.x}px, ${props.y}px)`,
  };
  return (
    <div style={style} className="track-tool-tip">
      Hello
    </div>
  );
}


TrackToolTip.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
};

export default TrackToolTip;
