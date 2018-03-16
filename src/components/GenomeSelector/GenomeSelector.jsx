// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import TextField from 'material-ui/TextField';
import AutoComplete from 'material-ui/AutoComplete';
import Slider from 'material-ui/Slider';
import RaisedButton from 'material-ui/RaisedButton/RaisedButton';
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
    this.handleUpdateChromid = this.handleUpdateChromid.bind(this);
    this.handleUpdateMinLength = this.handleUpdateMinLength.bind(this);
    this.handleUpdateMaxNumber = this.handleUpdateMaxNumber.bind(this);
    if (props.appModel) {
      this.appModel = props.appModel;
    }
    this.state = {
      title: '',
      genomeType: '',
      chromoName: 'Any',
      minLength : 10,
      maxnumber: 10000,
    };
  }

  handleUpdateTitle(event) {
    this.setState({
      title: event.target.value,
      fixTitle: true,
    });
  }

  handleUpdateType(event, index, value) {
    this.setState({
        genomeType: value,
    });
    if (!this.state.fixTitle) {
      this.setState({
        title: value,
      });
    }
  }

  handleUpdateChromName(chromoName) {
    this.setState({
        chromoName: chromoName,
    });
  }

  handleUpdatePValue(event, value) {
    this.setState({
      pvalue: value,
    });
  }

  handleUpdateMaxNumber(event, value) {
    this.setState({
      maxnumber: transform(value),
    });
  }

  buildGenomeQuery() {
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterName({ $contains: this.state.searchTrait });
    const infoQuery = builder.build();
    builder.newEdgeQuery();
    builder.filterMaxPValue(this.state.pvalue);
    builder.setToNode(infoQuery);
    const edgeQuery = builder.build();
    builder.newGenomeQuery();
    builder.addToEdge(edgeQuery);
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
        <AutoComplete
          floatingLabelText="Trait"
          searchText={this.state.searchTrait}
          filter={AutoComplete.caseInsensitiveFilter}
          openOnFocus={true}
          hintText="Type anything"
          dataSource={this.state.traits}
          onUpdateInput={this.handleUpdateTraitInput}
          errorText={!this.state.searchTrait ? 'This field is required' : ''}
        /><br /> <br />
        <AutoComplete
          floatingLabelText="Gene"
          searchText={this.state.searchGene}
          filter={AutoComplete.caseInsensitiveFilter}
          openOnFocus={true}
          hintText="Type anything"
          dataSource={this.state.genes}
          onUpdateInput={this.handleUpdateGeneInput}
        /><br /> <br /> <br />
        <div> {'P-Value < '} {this.state.pvalue} </div>
        <Slider
          min={0}
          max={0.1}
          step={0.001}
          value={this.state.pvalue}
          onChange={this.handleUpdatePValue}
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
          disabled={!this.state.searchTrait}
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
