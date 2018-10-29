// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import JobDetails from "../JobDetails/JobDetails";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import CircularProgress from "material-ui/CircularProgress";
import TextField from 'material-ui/TextField';
import MenuItem from 'material-ui/MenuItem';
import SelectField from 'material-ui/SelectField';
import { App } from '../../../App';
import { Canis } from 'valis';

class EnrichmentAnalysis extends React.Component {
  constructor(props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
      this.api = this.appModel.api;
    }
    this.state = {
      title: "Untitled Enrichment Analysis",
      selectedIndex: 0,
      selectedTrack: 0,
      availableIndices: [{ name: 'Roadmap Epigenomics ChromHMM states', value: 'rme' }],
      availableAnnotationTracks: [],
    };
  }


  handleUpdateTitle = (event) => {
    this.setState({
      title: event.target.value,
    });
  }

  isValid = () => {
    if (!this.state.title || this.state.title.length === 0) return false;
    return true;
  }

  runAnalysis = () => {
    let a = Canis.Api.getApp('giggle');
    Canis.Api.getApp('giggle').then((app) => {
      app.createJob({
        name: this.state.title,
        query: this.state.availableAnnotationTracks[this.state.selectedTrack].query,
      }).then(result => {
        this.props.appModel.viewModel.pushView(
          'Job Status',
          result.id,
          <JobDetails appModel={this.appModel} job={result} />
        );
      });
    });
  }

  handleUpdateSelectedIndex = (event, index, value) => {
    this.setState({
      selectedIndex: value,
    });
  }

  handleUpdateTrack = (event, index, value) => {
    this.setState({
      selectedTrack: value,
    });
  }

  componentDidMount() {
    const availableAnnotationTracks = [];
    for (const trackInfo of App.getQueryTracks()) {
      availableAnnotationTracks.push({
        queryTitle: trackInfo[0],
        query: trackInfo[1].query,
        type: trackInfo[1].type
      });
    }
    this.setState({
      availableAnnotationTracks: availableAnnotationTracks,
    });
  }

  render() {
    if (this.state.loading) {
      return (<div className="navigation-controller-loading">
        <CircularProgress size={80} thickness={5} />
      </div>);
    }

    const {
      availableIndices,
      availableAnnotationTracks,
    } = this.state;

    const availableAnnotationTrackItems = [];
    for (let i = 0; i < availableAnnotationTracks.length; i++) {
      const queryTitle = availableAnnotationTracks[i].queryTitle;
      const queryId = JSON.stringify(availableAnnotationTracks[i].query);
      availableAnnotationTrackItems.push(<MenuItem value={i} key={queryId} primaryText={queryTitle} />);
    }

    const availableIndicesItems = [];
    for (let i = 0; i < availableIndices.length; i++) {
      const indexTitle = availableIndices[i].name;
      availableIndicesItems.push(<MenuItem value={i} key={indexTitle} primaryText={indexTitle} />);
    }

    return (
      <div className="track-editor">
        <TextField
          value={this.state.title}
          floatingLabelText="Track Title"
          onChange={this.handleUpdateTitle}
          fullWidth={true}
          errorText={!this.state.title ? 'This field is required' : ''}
        /><br /> <br />
        <SelectField
          value={this.state.selectedTrack}
          floatingLabelText="Source Track"
          onChange={this.handleUpdateTrack}
          fullWidth={true}
          maxHeight={200}
        >
          {availableAnnotationTrackItems}
        </SelectField><br /> <br />
        <SelectField
          value={this.state.selectedIndex}
          floatingLabelText="Enrichment Set"
          onChange={this.handleUpdateIndex}
          fullWidth={true}
          maxHeight={200}
        >
          {availableIndicesItems}
        </SelectField><br /> <br />
        <RaisedButton
          label="Run Analysis"
          primary={true}
          onClick={() => this.runAnalysis()}
          disabled={!this.isValid()}
          style={{ position: "absolute", bottom: "10px", width: "90%" }}
        />
      </div>
    );
  }
}

EnrichmentAnalysis.propTypes = {
  appModel: PropTypes.object
};

export default EnrichmentAnalysis;
