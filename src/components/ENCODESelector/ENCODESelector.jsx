// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import TextField from 'material-ui/TextField';
import AutoComplete from 'material-ui/AutoComplete';
import Slider from 'material-ui/Slider';
import RaisedButton from 'material-ui/RaisedButton/RaisedButton';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import Checkbox from 'material-ui/Checkbox';
import CheckCircle from 'material-ui/svg-icons/action/check-circle';
import HighlightOff from 'material-ui/svg-icons/action/highlight-off';
import QueryBuilder, { QUERY_TYPE_GENOME } from '../../models/query.js';
import { CHROMOSOME_NAMES, DATA_SOURCE_ENCODE } from '../../helpers/constants.js';

// Styles
import './ENCODESelector.scss';

const logmin = 0;
const logmax = Math.pow(10, 6);
const power = 12;

function transform(value) {
  return Math.round((Math.exp(12 * value / logmax) - 1) / (Math.exp(power) - 1) * logmax);
}

function reverse(value) {
  return (1 / power) * Math.log(((Math.exp(power) - 1) * value / logmax) + 1) * logmax;
}


class ENCODESelector extends Component {
  constructor(props) {
    super(props);
    this.handleUpdateTitle = this.handleUpdateTitle.bind(this);
    this.handleUpdateType = this.handleUpdateType.bind(this);
    this.handleUpdateChromName = this.handleUpdateChromName.bind(this);
    this.handelUpdateBiosample = this.handelUpdateBiosample.bind(this);
    this.handleCheckBox = this.handleCheckBox.bind(this);
    this.handleUpdateMinLength = this.handleUpdateMinLength.bind(this);
    this.handleUpdateMaxNumber = this.handleUpdateMaxNumber.bind(this);
    if (props.appModel) {
      this.appModel = props.appModel;
      this.api = this.appModel.api;
    }
    this.state = {
      title: '',
      biosampleValue: 0,
      genomeTypeValue: 0,
      chromoNameValue: 0,
      minLength : 10,
      maxnumber: 10000,
      availableTypes: [],
      availableBiosamples: [],
      availableTargets: [],
      checked: [],
    };
  }

  componentDidMount() {
    this.availableChromoNames = ['Any'].concat(CHROMOSOME_NAMES);
    this.chromoNameItems = [];
    for (let i = 0; i < this.availableChromoNames.length; i++) {
      this.chromoNameItems.push(<MenuItem value={i} key={i} primaryText={this.availableChromoNames[i]} />);
    }
    // use api to pull all available types
    const builder = new QueryBuilder();
    builder.newGenomeQuery();
    builder.filterSource(DATA_SOURCE_ENCODE);
    const genomeQuery = builder.build();
    this.api.getDistinctValues('type', genomeQuery).then(data => {
      this.setState({
        availableTypes: data,
      });
    });
    // use api to pull all available Biosamples
    this.api.getDistinctValues('info.biosample', genomeQuery).then(data => {
      this.setState({
        availableBiosamples: data,
      });
    });
    // use api to pull all available targets
    this.api.getDistinctValues('info.targets', genomeQuery).then(data => {
      const checked = new Array(data.length).fill(false);
      this.setState({
        availableTargets: data,
        checked: checked,
      });
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
        title: this.state.availableTypes[value],
      });
    }
  }

  handleUpdateChromName(event, index, value) {
    this.setState({
      chromoNameValue: value,
    });
  }

  handelUpdateBiosample(event, index, value) {
    this.setState({
      biosampleValue: value,
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

  handleCheckBox(index) {
    const newChecked = this.state.checked;
    newChecked[index] = !newChecked[index];
    this.setState({
      checked: newChecked,
    });
  }

  buildQuery() {
    const builder = new QueryBuilder();
    builder.newGenomeQuery();
    builder.filterAssembly('GRCh37');
    // The chromoNameValue starts from 1, which is the same as the chromid in the backend
    if (this.state.chromoNameValue > 0) {
      builder.filterChromid(this.state.chromoNameValue);
    }
    const genomeType = this.state.availableTypes[this.state.genomeTypeValue];
    builder.filterType(genomeType);
    const biosample = this.state.availableBiosamples[this.state.biosampleValue];
    builder.filterBiosample(biosample);
    const targets = [];
    for (let i = 0; i < this.state.checked.length; i++) {
      if (this.state.checked[i] === true) {
        targets.push(this.state.availableTargets[i]);
      }
    }
    builder.filterTargets(targets);
    builder.filterLength({ '>' :this.state.minLength });
    builder.setLimit(this.state.maxnumber);
    const genomeQuery = builder.build();
    return genomeQuery;
  }

  addQueryTrack() {
    const query = this.buildQuery();
    this.appModel.addAnnotationTrack(this.state.title, query);
  }

  render() {
    const { availableTypes, availableBiosamples, availableTargets, checked } = this.state;
    const genomeTypeItems = [];
    for (let i = 0; i < availableTypes.length; i++) {
      genomeTypeItems.push(<MenuItem value={i} key={i} primaryText={availableTypes[i]} />);
    }
    const biosampleItems = [];
    for (let i = 0; i < availableBiosamples.length; i++) {
      biosampleItems.push(<MenuItem value={i} key={i} primaryText={availableBiosamples[i]} />);
    }
    const targetCheckboxes = [];
    for (let i = 0; i < availableTargets.length; i++) {
      targetCheckboxes.push(
        <Checkbox
          checkedIcon={<CheckCircle />}
          uncheckedIcon={<HighlightOff />}
          key={i}
          label={availableTargets[i]}
          checked={checked[i]}
          onCheck={() => this.handleCheckBox(i)}
        />
      );
    }
    return (
      <div className="track-editor">
        <TextField
          value={this.state.title}
          floatingLabelText="Track Title"
          onChange={this.handleUpdateTitle}
          errorText={!this.state.title ? 'This field is required' : ''}
        /><br /> <br />
        <SelectField
          value={this.state.biosampleValue}
          floatingLabelText="Biosample"
          onChange={this.handelUpdateBiosample}
          maxHeight={200}
        >
          {biosampleItems}
        </SelectField><br /> <br />
        <div> Target </div> <br />
        {targetCheckboxes}
        <br />
        <SelectField
          value={this.state.genomeTypeValue}
          floatingLabelText="Type"
          onChange={this.handleUpdateType}
          maxHeight={200}
        >
          {genomeTypeItems}
        </SelectField><br /> <br />
        <SelectField
          value={this.state.chromoNameValue}
          floatingLabelText="Chromosome"
          onChange={this.handleUpdateChromName}
          maxHeight={200}
        >
          {this.chromoNameItems}
        </SelectField><br /> <br /> <br />
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
          disabled={!this.state.title}
          style={{ position: 'absolute', bottom: '10px', width: '90%' }}
        />
      </div>
    );
  }
}

ENCODESelector.propTypes = {
  appModel: PropTypes.object,
};

export default ENCODESelector;
