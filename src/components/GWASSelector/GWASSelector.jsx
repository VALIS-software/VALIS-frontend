// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import TextField from 'material-ui/TextField';
import AutoComplete from 'material-ui/AutoComplete';
import Slider from 'material-ui/Slider';
import RaisedButton from 'material-ui/RaisedButton/RaisedButton';
import QueryBuilder from '../../models/query.js';

// Styles
import './GWASSelector.scss';


const logmin = 0;
const logmax = Math.pow(10, 6);
const power = 12;

function transform(value) {
  return Math.round((Math.exp(12 * value / logmax) - 1) / (Math.exp(power) - 1) * logmax);
}

function reverse(value) {
  return (1 / power) * Math.log(((Math.exp(power) - 1) * value / logmax) + 1) * logmax;
}

class GWASSelector extends Component {
  constructor(props) {
    super(props);
    this.handleUpdateTitle = this.handleUpdateTitle.bind(this);
    this.handleUpdateTraitInput = this.handleUpdateTraitInput.bind(this);
    this.handleUpdateGeneInput = this.handleUpdateGeneInput.bind(this);
    this.handleUpdatePValue = this.handleUpdatePValue.bind(this);
    this.handleUpdateMaxNumber = this.handleUpdateMaxNumber.bind(this);
    if (props.appModel) {
      this.appModel = props.appModel;
    }
    this.state = {
      title: '',
      searchTrait: '',
      searchGene: '',
      traits: ['cancer', 'Alzheimer', 'sleep', 'pain', 'hair color', 'asthma'],
      genes: ['CHI3L1', 'THADA'],
      pvalue: 0.05,
      maxnumber: 10000,
    };
  }

  handleUpdateTitle(event) {
    this.setState({
      title: event.target.value,
      fixTitle: true,
    });
  }

  handleUpdateTraitInput(searchText) {
    this.setState({
      searchTrait: searchText,
    });
    if (!this.state.fixTitle) {
      this.setState({
        title: searchText,
      });
    }
  }

  handleUpdateGeneInput(searchText) {
    this.setState({
      searchGene: searchText,
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

  buildGWASQuery() {
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
    builder.setLimit(this.state.maxnumber);
    const genomeQuery = builder.build();
    return genomeQuery;
  }

  addGWASQueryTrack() {
    const query = this.buildGWASQuery();
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
          onClick={() => this.addGWASQueryTrack()}
          disabled={!this.state.searchTrait}
          style={{ position: 'absolute', bottom: '10px', width: '90%' }}
        />
      </div>
    );
  }
}

GWASSelector.propTypes = {
  appModel: PropTypes.object,
};

export default GWASSelector;
