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
    "title": "Genomic Arithmetic", 
    "description": "Combine track regions, find regions that overlap, or subtract regions."
  }, 
  {
    "track_type": 'premium', 
    "title": "Linkage Disequillibrium Expansion", 
    "description": "Expand a variant set by finding all variants in LD."
  },
  {
    "track_type": 'premium', 
    "title": "Correlate Regulatory Elements", 
    "description": "Find regulatory annotations correlated with elements in your tracks."
  },
  {
    "track_type": 'premium', 
    "title": "Predict Functional Effects", 
    "description": "Find variants that regulate a particular set of genes using predictive models."
  },
  {
    "track_type": 'premium', 
    "title": "Export Data", 
    "description": "Download data from track in BED or VCF format."
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
