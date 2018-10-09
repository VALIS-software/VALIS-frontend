// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import UpgradeDialog from "../Shared/UpgradeDialog/UpgradeDialog";
import GWASSelector from "../GWASSelector/GWASSelector";
import GenomeSelector from "../GenomeSelector/GenomeSelector";
import UserFilesPanel from "../UserFilesPanel/UserFilesPanel";
import ENCODESelector from "../ENCODESelector/ENCODESelector";
import GTEXSelector from "../GTEXSelector/GTEXSelector";
import ExACSelector from "../ExACSelector/ExACSelector";
import TCGASelector from "../TCGASelector/TCGASelector";
import BooleanTrackSelector from "../BooleanTrackSelector/BooleanTrackSelector";
import DataListItem from "../DataListItem/DataListItem";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";
import App from "../../../App";

const TRACK_TYPE_GENOME = 'track_type_genome';
const TRACK_TYPE_GWAS = 'track_type_gwas';
const TRACK_TYPE_TCGA = 'track_type_tcga';
const TRACK_TYPE_EQTL = 'track_type_eqtl';
const TRACK_TYPE_EXAC = 'track_type_exac';
const TRACK_TYPE_ENCODE = 'track_type_encode';
const TRACK_TYPE_BOOLEAN = 'track_type_boolean';
const TRACK_TYPE_SEQUENCE = 'track_type_sequence';
const TRACK_TYPE_GENES = 'track_type_gene';
const TRACK_TYPE_USER_FILE = 'track_type_user_file';

// Styles
import "./DatasetSelector.scss";
import GeneAnnotationSelector from "../GeneAnnotationSelector/GeneAnnotationSelector";

const fixedTrackData = [
  {
    "track_type": TRACK_TYPE_USER_FILE,
    "title": "Uploaded files",
    "description": "Browse, manage, or upload custom files in VCF, 23andMe or BED format."
  },
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
    "track_type": TRACK_TYPE_EXAC,
    "title": "ExAC Variants",
    "description": "Search labeled variants of over 60k exomes from the Exome Aggregation Consortium."
  },
  {
    "track_type": TRACK_TYPE_EQTL,
    "title": "GTEx eQTLs",
    "description": "Quantitative trait loci from 53 human tissues curated from the Genotype-Tissue Expression project."
  },
  {
    "track_type": TRACK_TYPE_TCGA,
    "title": "TCGA Variants",
    "description": "Search germline and somatic mutations from The Cancer Genome Atlas."
  },
  {
    "track_type": TRACK_TYPE_SEQUENCE,
    "title": "Sequence",
    "description": "Nucleobase sequence of the forward strand (ENSEMBL)."
  },
  {
    "track_type": TRACK_TYPE_GENES,
    "title": "Gene Annotations",
    "description": "Filterable gene annotation track. (ENSEMBL)"
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
    } else if (trackType === TRACK_TYPE_EQTL) {
      this.viewModel.pushView(
        "GTEx eQTL's",
        null,
        <GTEXSelector appModel={this.appModel} viewModel={this.viewModel} />
      );
    }else if (trackType === TRACK_TYPE_TCGA) {
      this.viewModel.pushView(
        "TCGA Variants",
        null,
        <TCGASelector appModel={this.appModel} viewModel={this.viewModel} />
      );
    }else if (trackType === TRACK_TYPE_EXAC) {
      this.viewModel.pushView(
        "ExAC Variants",
        null,
        <ExACSelector appModel={this.appModel} viewModel={this.viewModel} />
      );
    } else if (trackType === TRACK_TYPE_BOOLEAN) {
      this.viewModel.pushView(
        "Boolean Tracks",
        null,
        <BooleanTrackSelector appModel={this.appModel} viewModel={this.viewModel} />
      );
    } else if (trackType === TRACK_TYPE_SEQUENCE) {
      App.addTrack({ name: 'GRCh38', type: 'sequence' });
    } else if (trackType === TRACK_TYPE_GENES) {
      this.viewModel.pushView(
        "Gene Annotations",
        null,
        <GeneAnnotationSelector />
      );
    } else if (trackType === TRACK_TYPE_USER_FILE) {
      this.viewModel.pushView(
        "My Files",
        null,
        <UserFilesPanel />
      );
    } else if (trackType === 'premium') {
      this.setState({
        showUpgrade: true,
      });
    }
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
      dataInfoBlocks.push(
        <DataListItem
          title={di.title}
          description={di.description}
          onClick={() => this.dataSetSelected(di.track_type)}
          key={di.title}
        />
      );
    }
    const dialog = this.state.showUpgrade ? (<UpgradeDialog open={true}/>) : (<span/>);
    return <div className="dataset-selector">{dialog}{dataInfoBlocks}</div>;
  }
}

DatasetSelector.propTypes = {
  appModel: PropTypes.object,
};

export default DatasetSelector;
