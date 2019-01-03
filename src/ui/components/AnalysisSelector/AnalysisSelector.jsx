// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import UpgradeDialog from "../Shared/UpgradeDialog/UpgradeDialog";
import BooleanTrackSelector from "../BooleanTrackSelector/BooleanTrackSelector";
import EnrichmentAnalysis from "../EnrichmentAnalysis/EnrichmentAnalysis";
import KaplanMeierAnalysis from "../KaplanMeierAnalysis/KaplanMeierAnalysis";
import LDExpansionAnalysis from "../LDExpansionAnalysis/LDExpansionAnalysis";
import KipoiAnalysis from "../KipoiAnalysis/KipoiAnalysis";
import DataListItem from "../DataListItem/DataListItem";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";

// Styles
import "./AnalysisSelector.scss";

const fixedAnalysisData = [
  {
    "track_type": 'enrichment',
    "title": "Enrichment Analysis",
    "description": "Test regulatory annotations, pathways or gene-sets for enrichment against elements in a track."
  },
  {
    "track_type": 'kaplanmeier',
    "title": "Kaplan Meier Curve",
    "description": "Estimate survival of a patient cohort based on a mutation or set of mutations."
  },
  {
    "track_type": 'ldexpansion',
    "title": "Linkage Disequillibrium Expansion",
    "description": "Expand a variant set by finding all variants in LD."
  },
  {
    "track_type": 'kipoiscore',
    "title": "Variant Effect Prediction",
    "description": "Convolutional neural network analysis for predicting DNA sequence activity."
  },
  // {
  //   "track_type": 'premium',
  //   "title": "Variant Effect Prediction",
  //   "description": "Run the ENSEMBL VEP pipeline to label variants."
  // },
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
    if (trackType === 'arithmetic') {
      this.viewModel.pushView(
        "Genomic Arithmetic",
        null,
        <BooleanTrackSelector appModel={this.appModel} />
      );
    } else if (trackType === 'enrichment') {
      this.viewModel.pushView(
        "Enrichment Analysis",
        null,
        <EnrichmentAnalysis appModel={this.appModel} />
      );
    } else if (trackType === 'kaplanmeier') {
      this.viewModel.pushView(
        "Kaplan Meier Curve",
        null,
        <KaplanMeierAnalysis appModel={this.appModel} />
      );
    } else if (trackType === 'ldexpansion') {
      this.viewModel.pushView(
        "Linkage Disequillibrium Expansion",
        null,
        <LDExpansionAnalysis appModel={this.appModel} />
      );
    } else if (trackType === 'kipoiscore') {
      this.viewModel.pushView(
        "Variant Effect Prediction",
        null,
        <KipoiAnalysis appModel={this.appModel} />
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

    return (<div className="dataset-selector"><UpgradeDialog onClose={() => this.setState({showUpgrade: false})} open={this.state.showUpgrade}/>{dataInfoBlocks}</div>);
  }
}

AnalysisSelector.propTypes = {
  appModel: PropTypes.object,
};

export default AnalysisSelector;
