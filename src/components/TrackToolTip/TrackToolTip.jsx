// Dependencies
import React from 'react';
import PropTypes from 'prop-types';

// Styles
import './TrackToolTip.scss';

function TrackToolTip(props) {
  const style = {
    transform: `translate(${props.x}px, ${props.y}px) translateY(-50%)`,
  };
  const bp = Math.round(props.basePair);
  const dataValues = [];
  props.values.forEach(value => {
    const colorIdx = dataValues.length;
    const colorStyle = {
      backgroundColor: 'rgb(' + props.colors[colorIdx].join(',') + ')',
    };
    const formattedValue = typeof value === 'number' ? value.toFixed(3) : value;
    dataValues.push((<tr key={colorIdx}><td><div style={colorStyle} className="legend" /></td><td>{formattedValue}</td></tr>));
  });
  return (
    <div className="track-tool-tip">
      <div style={style} className="track-tool-tip-arrow">
        <div className="track-tool-tip-inner">
          <div>BP:{bp}</div>
          <table>
            <tbody>
              {dataValues}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


TrackToolTip.propTypes = {
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
  basePair: PropTypes.number.isRequired,
  values: PropTypes.array.isRequired,
  colors: PropTypes.array.isRequired,
};

export default TrackToolTip;
