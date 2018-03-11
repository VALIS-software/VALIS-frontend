// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import GenomeAPI from '../../models/api.js';
// Styles
import './DatasetSelector.scss';

class DatasetSelector extends Component {
  constructor(props) {
    super(props);
    this.api = new GenomeAPI();
    this.state = {
      dataInfo : [],
    };
  }

  componentDidMount() {
    this.api.getTrackInfo().then(dataInfo => {
      this.setState({
        dataInfo: dataInfo,
      });
    });
  }

	render() {
    if (!this.state.dataInfo) return (<div />);
    const dataInfo = this.state.dataInfo;
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
    return (<div className="dataset-selector">{ dataInfoBlocks }</div>);
	}
}

DatasetSelector.propTypes = {
  api: PropTypes.object,
};

export default DatasetSelector;
