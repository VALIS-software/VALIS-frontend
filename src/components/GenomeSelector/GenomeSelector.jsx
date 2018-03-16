// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import TextField from 'material-ui/TextField';
import AutoComplete from 'material-ui/AutoComplete';
import Slider from 'material-ui/Slider';
import RaisedButton from 'material-ui/RaisedButton/RaisedButton';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import QueryBuilder from '../../models/query.js';
import { CHROMOSOME_NAMES, CHROMOSOME_IDS } from '../../helpers/constants.js';

// Styles
import './GenomeSelector.scss';


const logmin = 0;
const logmax = Math.pow(10, 6);
const power = 12;

function transform(value) {
  return Math.round((Math.exp(12 * value / logmax) - 1) / (Math.exp(power) - 1) * logmax);
}

function reverse(value) {
  return (1 / power) * Math.log(((Math.exp(power) - 1) * value / logmax) + 1) * logmax;
}

// all types and numbers in current database
// CDS 1369853
// C_gene_segment 28
// D_gene_segment 32
// J_gene_segment 105
// RNase_MRP_RNA 1
// RNase_P_RNA 1
// SNP 44796
// SRP_RNA 2
// V_gene_segment 424
// Y_RNA 4
// antisense_RNA 22
// cDNA_match 3980
// centromere 24
// enhancer 5
// exon 1804840
// gene 53823
// lnc_RNA 26187
// mRNA 109263
// match 20607
// miRNA 2813
// ncRNA 29
// primary_transcript 1881
// promoter 41
// rRNA 17
// region 26
// repeat_region 1
// snRNA 62
// snoRNA 431
// tRNA 421
// telomerase_RNA 1
// transcript 15197
// vault_RNA 3

class GenomeSelector extends Component {
  constructor(props) {
    super(props);
    this.handleUpdateTitle = this.handleUpdateTitle.bind(this);
    this.handleUpdateType = this.handleUpdateType.bind(this);
    this.handleUpdateChromName = this.handleUpdateChromName.bind(this);
    this.handleUpdateMinLength = this.handleUpdateMinLength.bind(this);
    this.handleUpdateMaxNumber = this.handleUpdateMaxNumber.bind(this);
    if (props.appModel) {
      this.appModel = props.appModel;
    }
    this.state = {
      title: '',
      genomeTypeValue: 0,
      chromoNameValue: 0,
      minLength : 10,
      maxnumber: 10000,
    };
  }

  componentDidMount() {
    // this.api.getTrackInfo().then(dataInfo => {
    //   this.setState({
    //     dataInfo: dataInfo,
    //   });
    // });
    this.availableTypes = ['gene', 'exon', 'mRNA', 'promoter', 'enhancer', 'SNP'];
    this.genomeTypeItems = [];
    for (let i = 0; i < this.availableTypes.length; i++) {
      this.genomeTypeItems.push(<MenuItem value={i} key={i} primaryText={this.availableTypes[i]} />);
    }
    this.availableChromoNames = ['Any'].concat(CHROMOSOME_NAMES);
    this.chromoNameItems = [];
    for (let i = 0; i < this.availableChromoNames.length; i++) {
      this.chromoNameItems.push(<MenuItem value={i} key={i} primaryText={this.availableChromoNames[i]} />);
    }
    this.setState({
      title: 'GRCh38',
    });
  }

  handleUpdateTitle(event) {
    this.setState({
      title: event.target.value,
      fixTitle: true,
    });
  }

  handleUpdateType(event, index, value) {
    this.setState({
      genomeTypeValue: value,
    });
    if (!this.state.fixTitle) {
      this.setState({
        title: this.availableTypes[value],
      });
    }
  }

  handleUpdateChromName(event, index, value) {
    this.setState({
      chromoNameValue: value,
    });
  }

  handleUpdateMinLength(event, value) {
    this.setState({
      minLength: value,
    });
  }

  handleUpdateMaxNumber(event, value) {
    this.setState({
      maxnumber: transform(value),
    });
  }

  buildGenomeQuery() {
    const builder = new QueryBuilder();
    builder.newGenomeQuery();
    // The chromoNameValue starts from 1, which is the same as the chromid in the backend
    if (this.state.chromoNameValue > 0) {
      builder.filterChromid(this.state.chromoNameValue);
    }
    const genomeType = this.availableTypes[this.state.genomeTypeValue];
    builder.filterType(genomeType);
    builder.filterLength({ '>' :this.state.minLength });
    builder.setLimit(this.state.maxnumber);
    const genomeQuery = builder.build();
    return genomeQuery;
  }

  addQueryTrack() {
    const query = this.buildGenomeQuery();
    this.appModel.addAnnotationTrack(this.state.title, query);
  }

	render() {
    return (
      <div className="track-editor">
        <TextField
          value={this.state.title}
          floatingLabelText="Track Title"
          onChange={this.handleUpdateTitle}
        /><br /> <br />
        <SelectField
          value={this.state.genomeTypeValue}
          floatingLabelText="Type"
          onChange={this.handleUpdateType}
          maxHeight={200}
        >
          {this.genomeTypeItems}
        </SelectField><br /> <br />
        <SelectField
          value={this.state.chromoNameValue}
          floatingLabelText="Chromosome"
          onChange={this.handleUpdateChromName}
          maxHeight={200}
        >
          {this.chromoNameItems}
        </SelectField><br /> <br />
        <div> {'Length > '} {this.state.minLength} </div>
        <Slider
          min={0}
          max={100}
          step={1}
          value={this.state.minLength}
          onChange={this.handleUpdateMinLength}
        />
        <div> {'Max Number of Results: '} {this.state.maxnumber} </div>
        <Slider
          min={logmin}
          max={logmax}
          step={(logmax-logmin) / 100}
          value={reverse(this.state.maxnumber)}
          onChange={this.handleUpdateMaxNumber}
        />
        <RaisedButton
          label="Create Track"
          primary={true}
          onClick={() => this.addQueryTrack()}
          style={{ position: 'absolute', bottom: '10px', width: '90%' }}
        />
      </div>
    );
  }
}

GenomeSelector.propTypes = {
  appModel: PropTypes.object,
};

export default GenomeSelector;
