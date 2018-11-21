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
import { App } from '../../../App';
import { Canis } from 'valis';
import './KaplanMeierAnalysis.scss';

class KaplanMeierAnalysis extends React.Component {
  constructor(props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
    }
    this.state = {
      title: "Untitled Kaplan-Meier Analysis",
      selectedTrack: 0,
      availableAnnotationTracks: [],
      gender: null,
      diseaseCode: null,
    };
  }

  handleUpdateTitle = (event) => {
    this.setState({
      title: event.target.value,
    });
  }

  handleUpdateTrack = (event, index, value) => {
    this.setState({
      selectedTrack: value,
    });
  }

  handleSelectGender = (e) => {
    this.setState({
      gender: e.value,
    })
  }

  handleSelectDiseaseCode = (e) => {
    this.setState({
      diseaseCode: e.value,
    })
  }

  runAnalysis = () => {
    const { title, gender, diseaseCode, availableAnnotationTracks, selectedTrack } = this.state;
    const query = availableAnnotationTracks[selectedTrack].query;
    Canis.Api.getApp('kaplan_meier').then((app) => {
      app.createJob({
        name: title,
        query: query,
        gender: gender,
        diseaseCode: diseaseCode,
      }).then(result => {
        this.props.appModel.viewModel.pushView(
          'Job Status',
          result.id,
          <JobDetails appModel={this.appModel} job={result}/>
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
      availableAnnotationTracks,
      gender,
      diseaseCode,
    } = this.state;

    const availableAnnotationTrackItems = [];
    for (let i = 0; i < availableAnnotationTracks.length; i++) {
      const queryTitle = availableAnnotationTracks[i].queryTitle;
      const queryId = JSON.stringify(availableAnnotationTracks[i].query);
      availableAnnotationTrackItems.push(<MenuItem value={i} key={queryId} primaryText={queryTitle} />);
    }

    const indicationItems = CANCER_NAMES.map((d) => {
      return { label : d[0], value: d[1] };
    });
    const currIndication = diseaseCode ? {value: diseaseCode, label: CANCER_NAME_MAP[diseaseCode]} : null;

    const genderItems = GENDER_NAMES.map((d) => {
      return { label : d[0], value: d[1] };
    });
    const currGender = gender ? {value: gender, label: GENDER_NAME_MAP[gender]} : null;

    const enableRunAnalysis = (title && availableAnnotationTracks.length > 0 && currIndication && currGender);

    return (
      <div className="track-editor kaplan-meier">
        <TextField
          value={title}
          floatingLabelText="Analysis Title"
          onChange={this.handleUpdateTitle}
          fullWidth={true}
          errorText={!title ? 'This field is required' : ''}
        /><br /> <br />
        <SelectField
          value={this.state.selectedTrack}
          floatingLabelText="Mutation region track"
          onChange={this.handleUpdateTrack}
          fullWidth={true}
          maxHeight={200}
        >
          {availableAnnotationTrackItems}
        </SelectField><br /> <br />
        <div className='selector'>
          <Select
            value={currIndication}
            onChange={this.handleSelectDiseaseCode}
            options={indicationItems}
            placeholder='Limit patients by indication'
          />
        </div>
        <div className='selector'>
          <Select
            value={currGender}
            onChange={this.handleSelectGender}
            options={genderItems}
            placeholder='Limit patients by gender'
          />
        </div>
        <RaisedButton
          label="Run Analysis"
          primary={true}
          onClick={() => this.runAnalysis()}
          style={{ position: "absolute", bottom: "10px", width: "90%" }}
          disabled={!enableRunAnalysis}
        />
      </div>
    );
  }
}

KaplanMeierAnalysis.propTypes = {
  appModel: PropTypes.object
};

export default KaplanMeierAnalysis;
