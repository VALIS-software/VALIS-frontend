// Dependencies
import React from 'react';
import PropTypes from 'prop-types';

// Styles
import './StatusTile.scss';

function StatusTileStatus(props) {
  let s = props.status;
  if (typeof s === 'number') {
    s = Number(s.toFixed(1));
  }
  return (
    <div className="statustile-status">
      <h4>{props.name}: {s}</h4>
    </div>
  );
}

StatusTileStatus.propTypes = {
  name: PropTypes.string.isRequired,
  status: PropTypes.any.isRequired,
};

function StatusTile(props) {
  return (
    <div id="statustile">
      <div id="statustile-title">
        <h4>Status</h4>
      </div>
      <StatusTileStatus name="framesPerSecond" status={props.framesPerSecond} />
      <StatusTileStatus name="cacheEntryCount" status={props.cacheEntryCount} />
      <StatusTileStatus name="displayedTileCount" status={props.displayedTileCount} />
    </div>
  );
}


StatusTile.propTypes = {
  framesPerSecond: PropTypes.number.isRequired,
  cacheEntryCount: PropTypes.number.isRequired,
  displayedTileCount: PropTypes.number.isRequired,
};

export default StatusTile;
