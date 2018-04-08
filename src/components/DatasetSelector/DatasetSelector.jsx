// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import GWASSelector from '../GWASSelector/GWASSelector.jsx';
import GenomeSelector from '../GenomeSelector/GenomeSelector.jsx';

import {
  TRACK_TYPE_SEQUENCE,
  TRACK_TYPE_FUNCTIONAL,
  TRACK_TYPE_GENOME,
  TRACK_TYPE_GWAS,
  TRACK_TYPE_EQTL,
  TRACK_TYPE_3D,
  TRACK_TYPE_NETWORK,
} from '../../helpers/constants.js';

// Styles
import './DatasetSelector.scss';

class DatasetSelector extends Component {
  constructor(props) {
    super(props);
    this.dataSetSelected = this.dataSetSelected.bind(this);
    if (props.appModel) {
      this.appModel = props.appModel;
      this.api = this.appModel.api;
    }
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


  dataSetSelected(trackType) {
    if (trackType === TRACK_TYPE_SEQUENCE) {
      //currSideBarInfo = 'Sequence Track';
    } else if (trackType === TRACK_TYPE_FUNCTIONAL) {
      //currSideBarInfo = 'Functional Track';
    } else if (trackType === TRACK_TYPE_GENOME) {
      // currSideBarType = SIDEBAR_TYPE_BROWSE_DATA_GENOME;
      //currSideBarInfo = 'Genome Elements Track';
    } else if (trackType === TRACK_TYPE_GWAS) {
      this.appModel.pushView('GWAS Track', null, (<GWASSelector appModel={this.appModel} />));
    } else if (trackType === TRACK_TYPE_EQTL) {
      //currSideBarInfo = 'eQTL Track';
    } else if (trackType === TRACK_TYPE_3D) {
      //currSideBarInfo = '3D Structure Track';
    } else if (trackType === TRACK_TYPE_NETWORK) {
      //currSideBarInfo = 'Network Track';
    }
  }

  render() {
    if (!this.state.dataInfo) return (<div />);
    const dataSetSelected = this.dataSetSelected;
    const dataInfo = this.state.dataInfo;
    const dataInfoBlocks = [];
    for (const di of dataInfo) {
      dataInfoBlocks.push(
        <DataButton
          title={di.title}
          description={di.description}
          onClick={() =>  this.dataSetSelected(di.track_type)}
          key={di.title}
        />
      );
    }
    return (<div className="dataset-selector">{ dataInfoBlocks }</div>);
  }
}

DatasetSelector.propTypes = {
  appModel: PropTypes.object,
};

function DataButton(props) {
  return (
    <button className="dataset-button" onClick={props.onClick}>
      <div className="option-title">
        {props.title}
      </div>
      <div className="option-description">
        {props.description}
      </div>
    </button>
  );
}

DataButton.propTypes = {
  onClick: PropTypes.func,
  title: PropTypes.string,
  description: PropTypes.string,
};

export default DatasetSelector;
