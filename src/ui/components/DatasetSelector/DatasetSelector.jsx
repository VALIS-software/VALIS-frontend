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
import "./DatasetSelector.scss";

const fixedTrackData = [
  {
    "track_type": TRACK_TYPE_GWAS, 
    "title": "Genome Wide Associations", 
    "description": "Add variants related to traits or diseases from the EMBL-EBI GWAS database."
  }, 
  {
    "track_type": TRACK_TYPE_ENCODE, 
    "title": "ENCODE DNA Elements", 
    "description": "Comprehensive parts list of functional elements in the human genome."
  }, 
  {
    "track_type": TRACK_TYPE_EQTL, 
    "title": "GTeX eQTLs", 
    "description": "Quantitative trait loci from 53 human tissues curated from the Genotype-Tissue Expression project."
  },  
  {
    "track_type": TRACK_TYPE_EQTL, 
    "title": "TCGA Variants", 
    "description": "Search germline and somatic mutations from The Cancer Genome Atlas."
  },  
  {
    "track_type": TRACK_TYPE_EQTL, 
    "title": "ExAC Variants", 
    "description": "Search labeled variants of over 60k exomes from the Exome Aggregation Consortium."
  },
  {
    "track_type": "track_type_custom", 
    "title": "Custom Track", 
    "description": "Securely visualize your own VCF, BAM, GFF, BED or bigwig files."
  }
];

class DatasetSelector extends React.Component {
  constructor(props) {
    super(props);
    this.appModel = props.appModel;
    this.viewModel = this.appModel.viewModel;
    this.api = this.appModel.api;

    this.state = {
      dataInfo: fixedTrackData
    };
  }

  componentDidMount() {

  }

  dataSetSelected = (trackType) => {
    if (trackType === TRACK_TYPE_GENOME) {
      this.viewModel.pushView(
        "Genomic Elements",
        null,
        <GenomeSelector appModel={this.appModel} viewModel={this.viewModel} />
      );
    } else if (trackType === TRACK_TYPE_GWAS) {
      this.viewModel.pushView(
        "GWAS Track",
        null,
        <GWASSelector appModel={this.appModel} viewModel={this.viewModel} />
      );
    } else if (trackType === TRACK_TYPE_ENCODE) {
      this.viewModel.pushView(
        "ENCODE Track",
        null,
        <ENCODESelector appModel={this.appModel} viewModel={this.viewModel} />
      );
    } else if (trackType === TRACK_TYPE_FUNCTIONAL) {
      this.viewModel.pushView(
        "Functional Tracks",
        null,
        <FunctionalTrackSelector appModel={this.appModel} />
      );
    } else if (trackType === TRACK_TYPE_SEQUENCE) {
      this.viewModel.pushView(
        "Sequence Tracks",
        null,
        <TrackSelector
          trackType={trackType}
          appModel={this.appModel}
          viewModel={this.viewModel}
        />
      );
    } else if (trackType === TRACK_TYPE_BOOLEAN) {
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

DatasetSelector.propTypes = {
  appModel: PropTypes.object,
};

export default DatasetSelector;
