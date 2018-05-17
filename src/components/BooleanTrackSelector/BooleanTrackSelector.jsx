// Dependencies
import * as React from 'react';
import * as PropTypes from 'prop-types';
import Slider from 'material-ui/Slider';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton/RaisedButton';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import QueryBuilder from '../../models/query.js';

// Styles
import './BooleanTrackSelector.scss';

const logmin = 0;
const logmax = Math.pow(10, 6);
const power = 12;

function transform(value) {
  return Math.round((Math.exp(12 * value / logmax) - 1) / (Math.exp(power) - 1) * logmax);
}

function reverse(value) {
  return (1 / power) * Math.log(((Math.exp(power) - 1) * value / logmax) + 1) * logmax;
}


class BooleanTrackSelector extends React.Component {
  constructor(props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
      this.api = this.appModel.api;
    }
    this.state = {
      title: '',
      operatorValue: 0,
      trackAValue: 0,
      trackBValue: 0,
      windowSize: 1000,
      availableOperators: [],
      availableAnnotationTracks: [],
    };
  }

  handleUpdateTitle = (event) => {
    this.setState({
      title: event.target.value,
      fixTitle: true,
    });
  }

  handleUpdateOperator = (event, index, value) => {
    this.setState({
      operatorValue: value,
    });
    if (!this.state.fixTitle) {
      this.setState({
        title: this.state.availableOperators[value],
      });
    }
  }

  handleUpdateTrackA = (event, index, value) => {
    this.setState({
      trackAValue: value,
    });
  }

  handleUpdateTrackB = (event, index, value) => {
    this.setState({
      trackBValue: value,
    });
  }

  handleUpdateWindowSize = (event, value) => {
    this.setState({
      windowSize: transform(value),
    });
  }

  buildQuery() {
    const { availableOperators, operatorValue, availableAnnotationTracks,
      trackAValue, trackBValue, windowSize } = this.state;
    // copy the existing queries
    const queryA = JSON.parse(JSON.stringify(availableAnnotationTracks[trackAValue].query));
    const queryB = JSON.parse(JSON.stringify(availableAnnotationTracks[trackBValue].query));
    const op = availableOperators[operatorValue];
    const builder = new QueryBuilder(queryA);
    if (op === 'intersect') {
      builder.addArithmeticIntersect(queryB);
    } else if (op === 'window') {
      builder.addArithmeticWindow(queryB, windowSize);
    } else if (op === 'union') {
      builder.addArithmeticUnion(queryB);
    }
    const query = builder.build();
    return query;
  }

  addQueryTrack() {
    const query = this.buildQuery();
    this.appModel.addAnnotationTrack(this.state.title, query);
  }

  componentDidMount() {
    const availableOperators = ['intersect', 'window', 'union'];
    const availableAnnotationTracks = [];
    for (const track of this.appModel.getTracks()) {
      if (track.annotationTrack !== null) {
        availableAnnotationTracks.push(track.annotationTrack);
      }
    }
    this.setState({
      availableOperators: availableOperators,
      availableAnnotationTracks: availableAnnotationTracks,
    });
  }

  render() {
    const { availableOperators, operatorValue, availableAnnotationTracks } = this.state;
    const op = availableOperators[operatorValue];
    const availableOperatorItems = [];
    for (let i = 0; i < availableOperators.length; i++) {
      availableOperatorItems.push(<MenuItem value={i} key={i} primaryText={availableOperators[i]} />);
    }
    const availableAnnotationTrackItems = [];
    for (let i = 0; i < availableAnnotationTracks.length; i++) {
      const annotationId = availableAnnotationTracks[i].annotationId;
      availableAnnotationTrackItems.push(<MenuItem value={i} key={i} primaryText={annotationId} />);
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
          value={this.state.operatorValue}
          floatingLabelText="Operator"
          onChange={this.handleUpdateOperator}
          maxHeight={200}
        >
          {availableOperatorItems}
        </SelectField><br /> <br />
        <SelectField
          value={this.state.trackAValue}
          floatingLabelText="Annotation Track A"
          onChange={this.handleUpdateTrackA}
          maxHeight={200}
        >
          {availableAnnotationTrackItems}
        </SelectField><br /> <br />
        <SelectField
          value={this.state.trackBValue}
          floatingLabelText="Annotation Track B"
          onChange={this.handleUpdateTrackB}
          maxHeight={200}
        >
          {availableAnnotationTrackItems}
        </SelectField><br /> <br /> <br />
        <div> {'Window Size  '} {this.state.windowSize} </div>
        <Slider
          min={logmin}
          max={logmax}
          step={(logmax - logmin) / 100}
          value={reverse(this.state.windowSize)}
          onChange={this.handleUpdateWindowSize}
          disabled={op !== 'window'}
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

BooleanTrackSelector.propTypes = {
  appModel: PropTypes.object,
};

export default BooleanTrackSelector;
