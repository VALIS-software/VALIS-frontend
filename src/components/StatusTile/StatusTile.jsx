// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import InputRange from 'react-input-range';
import 'react-input-range/lib/css/index.css';
// Styles
import './StatusTile.scss';

class StatusTile extends Component {
  constructor(props) {
    super(props);
    this.value = { min: 0, max: 24 };
    this.setValue = this.setValue.bind(this);
  }

  setValue(value) {
    this.value = value;
  }

  render() {
    return (
      <div id="statustile">
        <div className="status-wrapper">
          <InputRange
            maxValue={24}
            minValue={0}
            value={this.value}
            onChange={this.setValue} 
          />
        </div>
      </div>
    );
  }

}

StatusTile.propTypes = {
};

export default StatusTile;
