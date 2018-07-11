// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import TextField from "material-ui/TextField";
import AutoComplete from "material-ui/AutoComplete";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import SelectField from "material-ui/SelectField";
import MenuItem from "material-ui/MenuItem";
import Divider from "material-ui/Divider";
import { RadioButton, RadioButtonGroup } from 'material-ui/RadioButton';
import QueryBuilder from "sirius/QueryBuilder";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";
import SiriusApi from "sirius/SiriusApi";

// Styles
import "./FunctionalTrackSelector.scss";

class FunctionalTrackSelector extends React.Component {
  constructor(props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
      this.api = this.appModel.api;
    }
    this.state = {
      title: "",
      outTypeValue: null,
      biosampleValue: null,
      assayValue: null,
      accessionValue: 0,
      availableTypes: [],
      availableBiosamples: [],
      availableAssays: [],
      availableAccessions: [],
    };
  }

  updateAvailableTypes = () => {
    if (this.selectedType) return;
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterType("bigwig");
    if (this.selectedBiosample) {
      builder.filterBiosample(this.selectedBiosample);
    }
    if (this.selectedAssay) {
      builder.filterAssay(this.selectedAssay);
    }
    const infoQuery = builder.build();
    SiriusApi.getDistinctValues("info.outtype", infoQuery).then(data => {
      // Keep the current selection of type
      let newTypeValue = null;
      if (this.state.outTypeValue !== null) {
        const currentType = this.state.availableTypes[this.state.outTypeValue];
        newTypeValue = data.indexOf(currentType);
        if (newTypeValue < 0) {
          newTypeValue = null;
        }
      }
      this.setState({
        availableTypes: data,
        outTypeValue: newTypeValue
      });
    }, err => {
      this.appModel.error(this, err);
    });
  }

  updateAvailableBiosamples = () => {
    if (this.selectedBiosample) return;
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterType("bigwig");
    if (this.selectedType) {
      builder.filterOutType(this.selectedType);
    }
    if (this.selectedAssay) {
      builder.filterAssay(this.selectedAssay);
    }
    const infoQuery = builder.build();
    SiriusApi.getDistinctValues('info.biosample', infoQuery).then(data => {
      // Keep the current selection of biosample
      let newBiosampleValue = null;
      if (this.state.biosampleValue !== null) {
        const currentBiosample = this.state.availableBiosamples[this.state.biosampleValue];
        newBiosampleValue = data.indexOf(currentBiosample);
        if (newBiosampleValue < 0) {
          newBiosampleValue = null;
        }
      }
      this.setState({
        availableBiosamples: data,
        biosampleValue: newBiosampleValue,
      });
    }, err => {
      this.appModel.error(this, err);
      this.setState({
        error: err,
      });
    });
  }

  updateAvailableAssay = () => {
    if (this.selectedAssay) return;
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterType("bigwig");
    if (this.selectedBiosample) {
      builder.filterBiosample(this.selectedBiosample);
    }
    if (this.selectedType) {
      builder.filterOutType(this.selectedType);
    }
    const infoQuery = builder.build();
    SiriusApi.getDistinctValues("info.assay", infoQuery).then(data => {
      // Keep the current selection of assay
      let newAssayValue = null;
      if (this.state.assayValue !== null) {
        const currentAssay = this.state.availableAssays[this.state.assayValue];
        newAssayValue = data.indexOf(currentAssay);
        if (newAssayValue < 0) {
          newAssayValue = null;
        }
      }
      this.setState({
        availableAssays: data,
        assayValue: newAssayValue
      });
    }, err => {
      this.appModel.error(this, err);
    });
  }

  updateAvailableAccessions = () => {
    if (!(this.selectedType && this.selectedBiosample && this.selectedAssay)) return;
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterType("bigwig");
    builder.filterOutType(this.selectedType);
    builder.filterBiosample(this.selectedBiosample);
    builder.filterAssay(this.selectedAssay);
    builder.setLimit(10);
    const infoQuery = builder.build();
    SiriusApi.getQueryResults(infoQuery).then(results => {
      // Keep the current selection of assay
      const availableAccessions = [];
      for (const d of results.data) {
        availableAccessions.push(d.name);
      }
      // check default value
      if (availableAccessions.length > 0) {
        this.selectedAccession = availableAccessions[0];
      } else {
        // this will disable the create track button
        this.selectedAccession = null;
      }
      this.setState({
        availableAccessions: availableAccessions,
        accessionValue: 0
      });
    }, err => {
      this.appModel.error(this, err);
    });
  }


  handleUpdateTitle = (event) => {
    this.setState({
      title: event.target.value,
      fixTitle: true
    });
  }

  handelUpdateBiosample = (event, index, value) => {
    this.setState({
      biosampleValue: value
    });
    if (!this.state.fixTitle) {
      const newTitle =
        value === null ? "" : this.state.availableBiosamples[value];
      this.setState({
        title: newTitle,
      });
    }
    // Update the available types and targets
    if (value !== null) {
      this.selectedBiosample = this.state.availableBiosamples[value];
      this.updateAvailableTypes();
      this.updateAvailableAssay();
      this.updateAvailableAccessions();
    }
  }

  handleUpdateType = (event, index, value) => {
    this.setState({
      outTypeValue: value
    });
    // Update the available biosample and targets
    if (value !== null) {
      this.selectedType = this.state.availableTypes[value];
      this.updateAvailableBiosamples();
      this.updateAvailableAssay();
      this.updateAvailableAccessions();
    }
  }

  handleUpdateAssay = (event, index, value) => {
    this.setState({
      assayValue: value
    });
    // Update the available biosample and targets
    if (value !== null) {
      this.selectedAssay = this.state.availableAssays[value];
      this.updateAvailableBiosamples();
      this.updateAvailableTypes();
      this.updateAvailableAccessions();
    }
  }

  handleCheckAccession = (event, value) => {
    this.selectedAccession = this.state.availableAccessions[value];
    this.setState({
      accessionValue: value,
    })
  }

  addFunctionalTrack = () => {
    this.appModel.trackMixPanel('Add FunctionalTrack', { 'accession': this.selectedAccession });
    this.appModel.addDataTrack(this.selectedAccession);
  }

  componentDidMount() {
    // use api to pull all available biosamples
    this.updateAvailableBiosamples();
    this.updateAvailableTypes();
    this.updateAvailableAccessions();
  }

  render() {
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
    const {
      availableTypes,
      availableBiosamples,
      availableAssays,
      availableAccessions,
      accessionValue
    } = this.state;
    const outTypeItems = [<MenuItem value={null} primaryText="" key={-1} />];
    for (let i = 0; i < availableTypes.length; i++) {
      outTypeItems.push(
        <MenuItem value={i} key={i} primaryText={availableTypes[i]} />
      );
    }
    const biosampleItems = [<MenuItem value={null} primaryText="" key={-1} />];
    for (let i = 0; i < availableBiosamples.length; i++) {
      biosampleItems.push(
        <MenuItem value={i} key={i} primaryText={availableBiosamples[i]} />
      );
    }
    const assayItems = [<MenuItem value={null} primaryText="" key={-1} />];
    for (let i = 0; i < availableAssays.length; i++) {
      assayItems.push(
        <MenuItem value={i} key={i} primaryText={availableAssays[i]} />
      );
    }
    const accessionRadioButtons = [];
    for (let i = 0; i < availableAccessions.length; i++) {
      accessionRadioButtons.push(
        <RadioButton
          key={availableAccessions[i]}
          value={i}
          label={availableAccessions[i]}
        />
      );
    }
    return (
      <div className="track-editor">
        <TextField
          value={this.state.title}
          floatingLabelText="Track Title"
          onChange={this.handleUpdateTitle}
          errorText={!this.state.title ? "This field is required" : ""}
        />{" "}
        <br />
        <SelectField
          value={this.state.biosampleValue}
          floatingLabelText="Biosample"
          onChange={this.handelUpdateBiosample}
          maxHeight={200}
          errorText={this.state.biosampleValue === null ? "Pick one" : null}
        >
          {biosampleItems}
        </SelectField>{" "}
        <br />
        <SelectField
          value={this.state.outTypeValue}
          floatingLabelText="Out Type"
          onChange={this.handleUpdateType}
          maxHeight={200}
          errorText={this.state.outTypeValue === null ? "Pick one" : null}
        >
          {outTypeItems}
        </SelectField>{" "}
        <br />
        <SelectField
          value={this.state.assayValue}
          floatingLabelText="Assay"
          onChange={this.handleUpdateAssay}
          maxHeight={200}
          errorText={this.state.assayValue === null ? "Pick one" : null}
        >
          {assayItems}
        </SelectField>{" "}
        <br /> <br />
        {accessionRadioButtons && (
          <div>
            <div className="item-header"> Accessions </div>
            <Divider />
            <RadioButtonGroup name="accession" defaultSelected={0} onChange={this.handleCheckAccession}>
              {accessionRadioButtons}
            </RadioButtonGroup>
          </div>
        )}
        <RaisedButton
          label="Create Track"
          primary={true}
          onClick={() => this.addFunctionalTrack()}
          disabled={!this.selectedAccession}
          style={{ position: "absolute", bottom: "10px", width: "90%" }}
        />
      </div>
    );
  }
}

FunctionalTrackSelector.propTypes = {
  appModel: PropTypes.object
};

export default FunctionalTrackSelector;
