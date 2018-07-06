// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import GWASSelector from "../GWASSelector/GWASSelector.jsx";
import GenomeSelector from "../GenomeSelector/GenomeSelector.jsx";
import TrackSelector from "../TrackSelector/TrackSelector.jsx";
import FunctionalTrackSelector from "../FunctionalTrackSelector/FunctionalTrackSelector.jsx";
import ENCODESelector from "../ENCODESelector/ENCODESelector.jsx";
import BooleanTrackSelector from "../BooleanTrackSelector/BooleanTrackSelector.jsx";
import DataListItem from "../DataListItem/DataListItem.jsx";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails.jsx";
import {
  TRACK_TYPE_SEQUENCE,
  TRACK_TYPE_FUNCTIONAL,
  TRACK_TYPE_GENOME,
  TRACK_TYPE_GWAS,
  TRACK_TYPE_ENCODE,
  TRACK_TYPE_BOOLEAN,
  TRACK_TYPE_EQTL,
} from "../../helpers/constants";

// Styles
import "./AnalysisSelector.scss";

const fixedAnalysisData = [
  {
    "track_type": TRACK_TYPE_BOOLEAN, 
    "title": "∩ Intersect Tracks", 
    "description": "Find elements within a certain base pair range of another track."
  },
  {
    "track_type": TRACK_TYPE_BOOLEAN, 
    "title": "∪ Union Tracks", 
    "description": "Union the contents of two different tracks into a single track."
  },
  {
    "track_type": TRACK_TYPE_BOOLEAN, 
    "title": "Correlate Regulatory Elements", 
    "description": "Correlate sets of variants to regulatory annotations across a broad set of cell-types."
  },
  {
    "track_type": TRACK_TYPE_BOOLEAN, 
    "title": "Correlate Samples", 
    "description": "Choose sets of variants and correlate them against cohorts of patient variants."
  },
  {
    "track_type": TRACK_TYPE_BOOLEAN, 
    "title": "Predict Regulatory Effect", 
    "description": "Predict the effect of non-coding variants on gene expression."
  },
];

class AnalysisSelector extends React.Component {
  constructor(props) {
    super(props);
    this.appModel = props.appModel;
    this.viewModel = this.appModel.viewModel;
    this.api = this.appModel.api;

    this.state = {
      dataInfo: fixedAnalysisData
    };
  }


  dataSetSelected = (trackType) => {
    if (trackType === TRACK_TYPE_BOOLEAN) {
      this.viewModel.pushView(
        "Boolean Tracks",
        null,
        <BooleanTrackSelector appModel={this.appModel} />
      );
    }
  }

  render() {
    if (!this.state.dataInfo) {
      return <div />;
    }
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
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
    return <div className="dataset-selector">{dataInfoBlocks}</div>;
  }
}

AnalysisSelector.propTypes = {
  appModel: PropTypes.object,
};

export default AnalysisSelector;
