// Dependencies
import * as React from 'react';
import * as PropTypes from 'prop-types';
import Slider from 'material-ui/Slider';
import TextField from 'material-ui/TextField';
import RaisedButton from 'material-ui/RaisedButton/RaisedButton';
import SelectField from 'material-ui/SelectField';
import MenuItem from 'material-ui/MenuItem';
import { QueryBuilder } from 'valis';
import TokenBox from '../Shared/TokenBox/TokenBox';
import Dialog from "material-ui/Dialog";
import NavigationClose from "material-ui/svg-icons/navigation/close";
import NavigationArrowBack from "material-ui/svg-icons/navigation/arrow-back";
import IconButton from "material-ui/IconButton";

// Styles
import './BooleanTrackSelector.scss';
import { App } from '../../../App';

const logmin = 0;
const logmax = 5 * Math.pow(10, 6);
const power = 12;

function transform(value) {
  return Math.round((Math.exp(power * value / logmax) - 1) / (Math.exp(power) - 1) * logmax);
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

  getOutputQueryType() {
      const queryA = this.props.sourceQuery;
      const queryB = this.state.availableAnnotationTracks[this.state.trackBValue];
      const op = this.state.availableOperators[this.state.operatorValue];
      if (op === 'intersect' || op === 'window' || op === 'difference') {
        return queryA.type;
      } else if (queryA.type === queryB.type === 'variant'){
        return 'variant';
      } else {
        return 'interval';
      }
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
    } else if (op === 'difference') {
      builder.addArithmeticDiff(queryB);
    }
    const query = builder.build();
    return query;
  }

  addQueryTrack() {
    const query = this.buildQuery();

    if (this.getOutputQueryType() === 'interval') {
      App.addIntervalTrack(this.state.title, query, false);
    } else {
      App.addVariantTrack(this.state.title, query);
    }
  }

  componentDidMount() {
    const availableOperators = ['intersect', 'window', 'union', 'difference'];
    const availableAnnotationTracks = [];
    for (const trackInfo of App.getQueryTracks()) {
      availableAnnotationTracks.push({
        queryTitle: trackInfo[0],
        query: trackInfo[1].query,
        type: trackInfo[1].type
      });
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
      const queryTitle = availableAnnotationTracks[i].queryTitle;
      const queryId = JSON.stringify(availableAnnotationTracks[i].query);
      availableAnnotationTrackItems.push(<MenuItem value={i} key={queryId} primaryText={queryTitle} />);
    }

    const currTitle = (<div>
        {'Enter Intersection Query'}
        <IconButton style={{position: 'absolute', right: 0, top: 0}} onClick={this.props.closeClicked}>
            <NavigationClose />
        </IconButton>
    </div>);
    return (
        <Dialog
          title={currTitle}
          modal={false}
          open={this.props.visible}
          onRequestClose={this.props.closeClicked}
          autoScrollBodyContent={true}
          className='boolean-selector'
        ><TokenBox appModel={this.props.appModel} viewModel={this.props.appModel.viewModel} ref={(v) => {this.tokenBoxRef = v}}/>
        <SelectField
          value={this.state.operatorValue}
          floatingLabelText="Operator"
          onChange={this.handleUpdateOperator}
          maxHeight={200}
        >
          {availableOperatorItems}
        </SelectField><br /> <br />
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
          label="Finish"
          primary={true}
          onClick={() => this.addQueryTrack()}
          style={{ position: 'absolute', bottom: '10px', width: '90%' }}
        />
        </Dialog>
    );
  }
}

BooleanTrackSelector.propTypes = {
  appModel: PropTypes.object,
  sourceQuery: PropTypes.object,
  visible: PropTypes.boolean,
};

export default BooleanTrackSelector;
