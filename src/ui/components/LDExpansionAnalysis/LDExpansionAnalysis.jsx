// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import JobDetails from "../JobDetails/JobDetails";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import Select from 'react-select';
import { CANCER_NAMES, CANCER_NAME_MAP, GENDER_NAMES, VITAL_STATUS_NAMES, VITAL_STATUS_MAP, GENDER_NAME_MAP, MIN_AGE, MAX_AGE } from '../TCGASelector/TCGAConstants';
import TextField from 'material-ui/TextField';
import MenuItem from 'material-ui/MenuItem';
import SelectField from 'material-ui/SelectField';
import Slider from "material-ui/Slider";
import { App } from '../../../App';
import { Canis } from 'valis';
import './LDExpansionAnalysis.scss';

class LDExpansionAnalysis extends React.Component {
  constructor(props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
      this.api = this.appModel.api;
    }

    this.filters = new Map();
    this.state = {
      title: "Untitled LD-Expansion Analysis",
      selectedTrack: 0,
      availableAnnotationTracks: [],
      corrThresh: 0.4,
      selectedLDSource: "EUR",
    };
  }


  handleUpdateTitle = (event) => {
    this.setState({
      title: event.target.value,
    });
  }

  handleSelectTrack = (event, index, value) => {
    this.setState({
      selectedTrack: value,
    });
  }

  handleUpdateCorrThresh = (event, value) => {
    this.setState({
      corrThresh: value? parseFloat(value): 0,
    });
  }

  handleSelectLDSource = (event, index, value) => {
    this.setState({
      selectedLDSource: value,
    });
  }

  runAnalysis = () => {
    Canis.Api.getApp('ld_expansion').then((app) => {
      app.createJob({
        name: this.state.title,
        query: this.state.availableAnnotationTracks[this.state.selectedTrack].query,
        corrThresh: this.state.corrThresh,
        ldSource: this.state.selectedLDSource,
      }).then(job => {
        this.props.appModel.viewModel.pushView(
          'Job Status',
          job.id,
          <JobDetails appModel={this.appModel} job={job} resultFile="ld_expanded_results.vcf.gz"/>
        );
      });
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

    const {
      title,
      selectedTrack,
      availableAnnotationTracks,
      corrThresh,
      selectedLDSource,
    } = this.state;

    const availableAnnotationTrackItems = [];
    for (let i = 0; i < availableAnnotationTracks.length; i++) {
      const queryTitle = availableAnnotationTracks[i].queryTitle;
      const queryId = JSON.stringify(availableAnnotationTracks[i].query);
      availableAnnotationTrackItems.push(<MenuItem value={i} key={queryId} primaryText={queryTitle} />);
    }

    const ldSources = ["EUR", "AMR", "AFR", "EAS", "SAS"]
    const availableLDSourceItems = ldSources.map(s => {return (
      <MenuItem value={s} key={s} primaryText={s} />
    );})

    const corrThreshIsValid = (corrThresh >= 0.4 && corrThresh <= 1.0);

    return (
      <div className="track-editor ld-expansion">
        <TextField
          value={title}
          floatingLabelText="Analysis Title"
          onChange={this.handleUpdateTitle}
          fullWidth={true}
          errorText={!title ? 'This field is required' : ''}
        /><br /> <br />
        <SelectField
          value={selectedTrack}
          floatingLabelText="Variant track"
          onChange={this.handleSelectTrack}
          fullWidth={true}
          maxHeight={200}
        >
          {availableAnnotationTrackItems}
        </SelectField><br /> <br />
        <SelectField
          value={selectedLDSource}
          floatingLabelText="LD Data Source"
          onChange={this.handleSelectLDSource}
          fullWidth={true}
          maxHeight={200}
        >
          {availableLDSourceItems}
        </SelectField><br /> <br />
        <TextField
          value={corrThresh}
          floatingLabelText="Correlation Threshold"
          onChange={this.handleUpdateCorrThresh}
          fullWidth={true}
          type="number"
          errorText={corrThreshIsValid?null: "Threshold should be in range [0.4, 1.0]"}
        />
        <Slider
          min={0.4}
          max={1.0}
          step={0.01}
          value={Math.min(Math.max(0.4, corrThresh), 1.0)}
          onChange={this.handleUpdateCorrThresh}
        /><br /> <br />
        <RaisedButton
          label="Run Analysis"
          primary={true}
          onClick={() => this.runAnalysis()}
          style={{ position: "absolute", bottom: "10px", width: "90%" }}
          disabled={!corrThreshIsValid || availableAnnotationTracks.length == 0 || !title}
        />
      </div>
    );
  }
}

LDExpansionAnalysis.propTypes = {
  appModel: PropTypes.object
};

export default LDExpansionAnalysis;
