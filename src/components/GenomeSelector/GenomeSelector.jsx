// Dependencies
import * as React from 'react';
import * as PropTypes from 'prop-types';
import TextField from 'material-ui/TextField';
import AutoComplete from 'material-ui/AutoComplete';
import Slider from 'material-ui/Slider';
import RaisedButton from 'material-ui/RaisedButton/RaisedButton';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import QueryBuilder, { QUERY_TYPE_GENOME } from '../../models/query.js';
import { CHROMOSOME_NAMES } from '../../helpers/constants.js';

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


class GenomeSelector extends React.Component {
  constructor(props) {
    super(props);
    this.handleUpdateTitle = this.handleUpdateTitle.bind(this);
    this.handleUpdateType = this.handleUpdateType.bind(this);
    this.handleUpdateChromName = this.handleUpdateChromName.bind(this);
    this.handleUpdateMinLength = this.handleUpdateMinLength.bind(this);
    this.handleUpdateMaxNumber = this.handleUpdateMaxNumber.bind(this);
    if (props.appModel) {
      this.appModel = props.appModel;
      this.api = this.appModel.api;
    }
    this.state = {
      title: '',
      genomeTypeValue: 0,
      chromoNameValue: 0,
      minLength: 10,
      maxnumber: 10000,
    };
  }

  componentDidMount() {
    // some pre-defined types
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
      genomeTypeValue: 0,
    });
    // use api to pull all available types
    const builder = new QueryBuilder();
    builder.newGenomeQuery();
    const genomeQuery = builder.build();
    this.api.getDistinctValues('type', genomeQuery).then(data => {
      this.availableTypes = data;
      this.genomeTypeItems = [];
      for (let i = 0; i < this.availableTypes.length; i++) {
        this.genomeTypeItems.push(<MenuItem value={i} key={i} primaryText={this.availableTypes[i]} />);
      }
      this.setState({
        genomeTypeValue: 0,
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
    builder.filterLength({ '>': this.state.minLength });
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
          errorText={!this.state.title ? 'This field is required' : ''}
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
          step={(logmax - logmin) / 100}
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

GenomeSelector.propTypes = {
  appModel: PropTypes.object,
};

export default GenomeSelector;
