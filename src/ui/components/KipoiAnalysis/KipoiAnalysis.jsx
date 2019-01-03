// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import JobDetails from "../JobDetails/JobDetails";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import TextField from 'material-ui/TextField';
import MenuItem from 'material-ui/MenuItem';
import SelectField from 'material-ui/SelectField';
import { App } from '../../../App';
import { Canis } from 'valis';
import './KipoiAnalysis.scss';

class KipoiAnalysis extends React.Component {
  constructor(props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
    }

    this.filters = new Map();
    this.state = {
      title: "Untitiled Variant Effect Prediction",
      selectedTrack: 0,
      availableAnnotationTracks: [],
      selectedKipoiModel: 'Basset',
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


  handleSelectKipoiModel = (event, index, value) => {
    this.setState({
      selectedKipoiModel: value,
    });
  }

  runAnalysis = () => {
    Canis.Api.getApp('kipoi_score').then((app) => {
      app.createJob({
        name: this.state.title,
        query: this.state.availableAnnotationTracks[this.state.selectedTrack].query,
        kipoiModel: this.state.selectedKipoiModel,
      }).then(job => {
        this.appModel.viewModel.pushView(
          'Job Status',
          job.id,
          <JobDetails appModel={this.appModel} job={job}/>
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
      selectedKipoiModel,
    } = this.state;

    const availableAnnotationTrackItems = [];
    for (let i = 0; i < availableAnnotationTracks.length; i++) {
      const queryTitle = availableAnnotationTracks[i].queryTitle;
      const queryId = JSON.stringify(availableAnnotationTracks[i].query);
      availableAnnotationTrackItems.push(<MenuItem value={i} key={queryId} primaryText={queryTitle} />);
    }

    const kipoiModels = ["Basset", "DeepSEA/variantEffects", "DeepBind/Homo_sapiens/TF/D00328.018_ChIP-seq_CTCF"]
    const availableModelItems = kipoiModels.map(s => {return (
      <MenuItem value={s} key={s} primaryText={s} />
    );})

    return (
      <div className="track-editor kipoi-score">
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
          value={selectedKipoiModel}
          floatingLabelText="CNN Model"
          onChange={this.handleSelectKipoiModel}
          fullWidth={true}
          maxHeight={200}
        >
          {availableModelItems}
        </SelectField><br /> <br />
        <RaisedButton
          label="Run Analysis"
          primary={true}
          onClick={() => this.runAnalysis()}
          style={{ position: "absolute", bottom: "10px", width: "90%" }}
          disabled={availableAnnotationTracks.length == 0 || !title}
        />
      </div>
    );
  }
}

KipoiAnalysis.propTypes = {
  appModel: PropTypes.object
};

export default KipoiAnalysis;
