// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { CHROMOSOME_NAMES } from '../../helpers/constants.js';

// Styles
import './DatasetSelector.scss';

class DatasetSelector extends Component {
	render() {
    if (!this.props.dataInfo) return (<div />);
    const dataInfo = this.props.dataInfo;
    const dataInfoBlocks = [];
    for (const di of dataInfo) {
      dataInfoBlocks.push(
        <div className="dataset-option">
          <div className="option-title">
            {di.title}
          </div> 
          <div className="option-description">
            {di.description}
          </div>
        </div>
      );
    }
		return <div className="dataset-selector">{ dataInfoBlocks }</div>;
	}
}

DatasetSelector.propTypes = {
  dataInfo: PropTypes.object,
};

export default DatasetSelector;
