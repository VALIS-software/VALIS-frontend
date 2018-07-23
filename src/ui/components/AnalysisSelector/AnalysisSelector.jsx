// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import UpgradeDialog from "../Shared/UpgradeDialog/UpgradeDialog";
import BooleanTrackSelector from "../BooleanTrackSelector/BooleanTrackSelector";
import DataListItem from "../DataListItem/DataListItem";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";
import {
  TRACK_TYPE_BOOLEAN,
} from "../../helpers/constants";

// Styles
import "./AnalysisSelector.scss";

const fixedAnalysisData = [
  {
    "track_type": TRACK_TYPE_BOOLEAN, 
    "title": "∩ Intersect Tracks", 
    "description": "Filter track elements to those near another tracks elements."
  }, 
  {
    "track_type": TRACK_TYPE_BOOLEAN, 
    "title": "∪ Union Tracks", 
    "description": "Union the contents of two different tracks into a single track."
  },
  {
    "track_type": 'premium', 
    "title": "Correlate Regulatory Elements", 
    "description": "Find regulatory annotations correlated with elements in your tracks."
  },
  {
    "track_type": 'premium', 
    "title": "Correlate Samples", 
    "description": "Correlate sets of variants or regulatory annotations to patient cohorts."
  },
  {
    "track_type": 'premium', 
    "title": "Predict Functional Effects", 
    "description": "Predict the effect of non-coding variants on expression, methylation or chromatin accessibility."
  },
  {
    "track_type": 'premium', 
    "title": "Export Data", 
    "description": "Export data from tracks to BED, GFF or CSV format."
  },
  {
    "track_type": 'premium', 
    "title": "Custom Analysis", 
    "description": "Write your own analysis function in R, Python or via REST API."
  },
];

class AnalysisSelector extends React.Component {
  constructor(props) {
    super(props);
    this.appModel = props.appModel;
    this.viewModel = this.appModel.viewModel;
    this.api = this.appModel.api;

    this.state = {
      dataInfo: fixedAnalysisData,
      showUpgrade: false,
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

  handleOpen = () => {
    this.setState({
      showUpgrade: true,
    });
  }
  render() {
    if (!this.state.dataInfo) {
      return <div />;
    }
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
    const dataInfo = this.state.dataInfo;
    const dataInfoBlocks = [];
    for (const di of dataInfo) {
      const fn = (di.track_type === 'premium') ? this.handleOpen : () => this.dataSetSelected(di.track_type);
      dataInfoBlocks.push(
        <DataListItem
          title={di.title}
          description={di.description}
          onClick={fn}
          key={di.title}
        />
      );
    }
    const dialog = this.state.showUpgrade ? (<UpgradeDialog open={true}/>) : (<span/>);
    return (<div className="dataset-selector">{dialog}{dataInfoBlocks}</div>);
  }
}

AnalysisSelector.propTypes = {
  appModel: PropTypes.object,
};

export default AnalysisSelector;
