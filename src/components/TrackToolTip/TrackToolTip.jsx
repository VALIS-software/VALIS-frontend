// Dependencies
import React from 'react';
import PropTypes from 'prop-types';

// Styles
import './TrackToolTip.scss';


function TrackToolTip(props) {
  if (!props.children) {
    return (<div />);
  }
  const style = {
    transform: `translate(${props.x}px, ${props.y}px) translateY(-50%)`,
  };
  return (
    <div className="track-tool-tip">
      <div style={style} className="track-tool-tip-arrow">
        <div className="track-tool-tip-inner">{props.children}</div>
      </div>
    </div>
  );
}


TrackToolTip.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  children: React.PropTypes.array,
};

export default TrackToolTip;
