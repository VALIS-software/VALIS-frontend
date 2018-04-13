// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import GWASSelector from '../GWASSelector/GWASSelector.jsx';
import GenomeSelector from '../GenomeSelector/GenomeSelector.jsx';
import TrackSelector from '../TrackSelector/TrackSelector.jsx';
import ENCODESelector from '../ENCODESelector/ENCODESelector.jsx';
import DataListItem from '../DataListItem/DataListItem.jsx';

import {
  TRACK_TYPE_SEQUENCE,
  TRACK_TYPE_FUNCTIONAL,
  TRACK_TYPE_GENOME,
  TRACK_TYPE_GWAS,
  TRACK_TYPE_EQTL,
  TRACK_TYPE_ENCODE,
  TRACK_TYPE_3D,
  TRACK_TYPE_NETWORK,
} from '../../helpers/constants.js';

// Styles
import './DatasetSelector.scss';

class DatasetSelector extends Component {
  constructor(props) {
    super(props);
    this.dataSetSelected = this.dataSetSelected.bind(this);
    this.viewModel = props.viewModel;
    this.appModel = props.appModel;
    this.api = this.appModel.api;
    
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
    if (trackType === TRACK_TYPE_GENOME) {
      this.viewModel.pushView('Genomic Elements', null, (<GenomeSelector appModel={this.appModel} viewModel={this.viewModel} />));
    } else if (trackType === TRACK_TYPE_GWAS) {
      this.viewModel.pushView('GWAS Track', null, (<GWASSelector appModel={this.appModel} viewModel={this.viewModel} />));
    } else if (trackType === TRACK_TYPE_ENCODE) {
      this.viewModel.pushView('ENCODE Track', null, (<ENCODESelector appModel={this.appModel} viewModel={this.viewModel} />));
    } else if (trackType === TRACK_TYPE_FUNCTIONAL) {
      this.viewModel.pushView('Functional Tracks', null, (<TrackSelector trackType={trackType} appModel={this.appModel} viewModel={this.viewModel} />));
    } else if (trackType === TRACK_TYPE_SEQUENCE) {
      this.viewModel.pushView('Sequence Tracks', null, (<TrackSelector trackType={trackType} appModel={this.appModel} viewModel={this.viewModel} />));
    } else if (trackType === TRACK_TYPE_NETWORK) {
      this.viewModel.pushView('Network Tracks', null, (<TrackSelector trackType={trackType} appModel={this.appModel} viewModel={this.viewModel} />));
    }
  }

  render() {
    if (!this.state.dataInfo) return (<div />);
    const dataSetSelected = this.dataSetSelected;
    const dataInfo = this.state.dataInfo;
    const dataInfoBlocks = [];
    for (const di of dataInfo) {
      dataInfoBlocks.push(
        <DataListItem
          title={di.title}
          description={di.description}
          onClick={() => this.dataSetSelected(di.track_type)}
          key={di.title}
        />
      );
    }
    return (<div className="dataset-selector">{ dataInfoBlocks }</div>);
  }
}

DatasetSelector.propTypes = {
  appModel: PropTypes.object,
  viewModel: PropTypes.object,
};

export default DatasetSelector;
