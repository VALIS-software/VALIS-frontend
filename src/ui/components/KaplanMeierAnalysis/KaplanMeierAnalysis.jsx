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
      this.api = this.appModel.api;
    }

    this.filters = new Map();
    this.state = {
      title: "Untitled Kaplan-Meier Analysis",
      selectedTrack: 0,
      availableAnnotationTracks: [],
    };
  }


  handleUpdateTitle = (event) => {
    this.setState({
      title: event.target.value,
    });
  }


  buildPatientQuery = () => {
    let patientQuery = this.props.patientQuery;

    if (!patientQuery) {
        const builder = new QueryBuilder();
        builder.newInfoQuery();
        builder.filterType("patient");
        patientQuery = builder.build();
    }

    this.filters.forEach((v, k) => {
        patientQuery.filters[k] = v;
    });
    return patientQuery;
  }

  runAnalysis = () => {
    let a = Canis.Api.getApp('kaplan-meier');
    Canis.Api.getApp('kaplan-meier').then((app) => {
      app.createJob({
        name: this.state.title,
        patientQuery: this.buildPatientQuery(),
        regionQuery: this.state.availableAnnotationTracks[this.state.selectedTrack].query,
      }).then(result => {
        this.props.appModel.viewModel.pushView(
          'Job Status',
          result.id,
          <JobDetails appModel={this.appModel} job={result} />
        );
      });
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

  handleFilterChange = (filter, value) => {
    if (filter === 'Indication') {
        if (value.length === 0) {
            this.filters.delete('info.disease_code');
        } else {
            this.filters.set('info.disease_code', value );
        }
    } else if (filter === 'Gender') {
        if (value.length === 0) {
            this.filters.delete('info.gender');
        } else {
            this.filters.set('info.gender',   value);
        }
    } 
    this.forceUpdate();
  }

  render() {

    const {
      availableAnnotationTracks,
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
    const currIndication = this.filters.get('info.disease_code') ? {value: this.filters.get('info.disease_code'), label: CANCER_NAME_MAP[this.filters.get('info.disease_code')]} : null;

    const genderItems = GENDER_NAMES.map((d) => {
      return { label : d[0], value: d[1] };
    });
    const currGender = this.filters.get('info.gender') ? {value: this.filters.get('info.gender'), label: GENDER_NAME_MAP[this.filters.get('info.gender')]} : null;
    return (
      <div className="track-editor kaplan-meier">
        <TextField
          value={this.state.title}
          floatingLabelText="Analysis Title"
          onChange={this.handleUpdateTitle}
          fullWidth={true}
          errorText={!this.state.title ? 'This field is required' : ''}
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
        <div class='selector'><Select
            value={currIndication}
            onChange={(d) => this.handleFilterChange('Indication', d.value)}
            options={indicationItems}
            placeholder='Limit patients by indication'
          />
        </div>
        <div class='selector'><Select
            value={currGender}
            onChange={(d) => this.handleFilterChange('Gender', d.value)}
            options={genderItems}
            placeholder='Limit patients by gender'
          />
        </div>
        <RaisedButton
          label="Run Analysis"
          primary={true}
          onClick={() => this.runAnalysis()}
          style={{ position: "absolute", bottom: "10px", width: "90%" }}
        />
      </div>
    );
  }
}

KaplanMeierAnalysis.propTypes = {
  appModel: PropTypes.object
};

export default KaplanMeierAnalysis;
