// Dependencies
import React from 'react';
import PropTypes from 'prop-types';

// Styles
import './TrackToolTip.scss';


function TrackToolTip(props) {
  const style1 = {
    transform: `translate(${props.x}px, ${props.y}px) translateY(-50%)`,
  };
  return (
    <div className="track-tool-tip">
      <div style={style1} className="track-tool-tip-arrow">
        <div className="track-tool-tip-inner">{props.children}</div>
      </div>
    </div>
  );
}


TrackToolTip.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  children: React.PropTypes.element.isRequired,
};

export default TrackToolTip;
