// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import TextField from "material-ui/TextField";
import AutoComplete from "material-ui/AutoComplete";
import Slider from "material-ui/Slider";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import SelectField from "material-ui/SelectField";
import MenuItem from "material-ui/MenuItem";
import Checkbox from "material-ui/Checkbox";
import Divider from "material-ui/Divider";
import QueryBuilder from "../../models/query.js";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails.jsx";

import {
  CHROMOSOME_NAMES,
  DATA_SOURCE_ENCODE
} from "../../helpers/constants.js";

// Styles
import "./ENCODESelector.scss";

const logmin = 0;
const logmax = Math.pow(10, 6);
const power = 12;

function transform(value) {
  return Math.round(
    (Math.exp(12 * value / logmax) - 1) / (Math.exp(power) - 1) * logmax
  );
}

function reverse(value) {
  return (
    1 / power * Math.log((Math.exp(power) - 1) * value / logmax + 1) * logmax
  );
}

class ENCODESelector extends React.Component {
  constructor(props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
      this.api = this.appModel.api;
    }
    this.state = {
      title: "",
      biosampleValue: null,
      genomeTypeValue: null,
      chromoNameValue: 0,
      minLength: 10,
      maxnumber: 10000,
      availableTypes: [],
      availableBiosamples: [],
      availableTargets: [],
      checked: []
    };
  }

  updateAvailableBiosamples = () => {
    if (this.selectedBiosample) return;
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterSource(DATA_SOURCE_ENCODE);
    builder.filterType('ENCODE_accession');
    if (this.selectedType) {
      builder.filterInfotypes(this.selectedType);
    }
    if (this.selectedTargets) {
      builder.filterTargets(this.selectedTargets);
    }
    const infoQuery = builder.build();
    this.api.getDistinctValues('info.biosample', infoQuery).then(data => {
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

  updateAvailableTypes = () => {
    if (this.selectedType) return;
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterSource(DATA_SOURCE_ENCODE);
    builder.filterType("ENCODE_accession");
    if (this.selectedBiosample) {
      builder.filterBiosample(this.selectedBiosample);
    }
    if (this.selectedTargets) {
      builder.filterTargets(this.selectedTargets);
    }
    const infoQuery = builder.build();
    this.api.getDistinctValues("info.types", infoQuery).then(data => {
      // Keep the current selection of type
      let newTypeValue = null;
      if (this.state.genomeTypeValue !== null) {
        const currentType = this.state.availableTypes[this.state.genomeTypeValue];
        newTypeValue = data.indexOf(currentType);
        if (newTypeValue < 0) {
          newTypeValue = null;
        }
      }
      this.setState({
        availableTypes: data,
        genomeTypeValue: newTypeValue
      });
    }, err => {
      this.appModel.error(this, err);
    });
  }

  updateAvailableTargets = () => {
    if (this.selectedTargets) return;
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterSource(DATA_SOURCE_ENCODE);
    builder.filterType("ENCODE_accession");
    if (this.selectedBiosample) {
      builder.filterBiosample(this.selectedBiosample);
    }
    if (this.selectedType) {
      builder.filterInfotypes(this.selectedType);
    }
    const infoQuery = builder.build();
    this.api.getDistinctValues("info.targets", infoQuery).then(data => {
      // Keep the current selection of targets
      const newChecked = new Array(data.length).fill(false);
      for (let i = 0; i < this.state.checked.length; i++) {
        if (this.state.checked[0]) {
          const checkedTarget = this.state.availableTargets[i];
          const newCheckedIndex = data.indexOf(checkedTarget);
          if (newCheckedIndex > 0) {
            newChecked[newCheckedIndex] = true;
          }
        }
      }
      this.setState({
        availableTargets: data,
        checked: newChecked
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
        title: newTitle
      });
    }
    // Update the available types and targets
    if (value !== null) {
      this.selectedBiosample = this.state.availableBiosamples[value];
      this.updateAvailableTypes();
      this.updateAvailableTargets();
    }
  }

  handleUpdateType = (event, index, value) => {
    this.setState({
      genomeTypeValue: value
    });
    // Update the available biosample and targets
    if (value !== null) {
      this.selectedType = this.state.availableTypes[value];
      this.updateAvailableBiosamples();
      this.updateAvailableTargets();
    }
  }

  handleCheckBox = (index) => {
    const newChecked = this.state.checked;
    newChecked[index] = !newChecked[index];
    this.setState({
      checked: newChecked
    });
    // Update the available biosamples and types
    this.selectedTargets = [];
    for (let i = 0; i < this.state.checked.length; i++) {
      if (this.state.checked[i]) {
        this.selectedTargets.push(this.state.availableTargets[i]);
      }
    }
    this.updateAvailableBiosamples();
    this.updateAvailableTypes();
  }

  handleUpdateChromName = (event, index, value) => {
    this.setState({
      chromoNameValue: value
    });
  }

  handleUpdateMinLength = (event, value) => {
    this.setState({
      minLength: value
    });
  }

  handleUpdateMaxNumber = (event, value) => {
    this.setState({
      maxnumber: transform(value)
    });
  }

  buildQuery = () => {
    const builder = new QueryBuilder();
    builder.newGenomeQuery();
    if (this.state.chromoNameValue > 0) {
      const contig = this.availableChromoNames[this.state.chromoNameValue];
      builder.filterContig(contig);
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
    builder.filterLength({ ">": this.state.minLength });
    builder.setLimit(this.state.maxnumber);
    const genomeQuery = builder.build();
    return genomeQuery;
  }

  addQueryTrack = () => {
    const query = this.buildQuery();
    this.appModel.addAnnotationTrack(this.state.title, query);
  }

  componentDidMount() {
    this.availableChromoNames = ['Any'].concat(CHROMOSOME_NAMES);
    this.chromoNameItems = [];
    for (let i = 0; i < this.availableChromoNames.length; i++) {
      this.chromoNameItems.push(<MenuItem value={i} key={i} primaryText={this.availableChromoNames[i]} />);
    }
    // use api to pull all available biosamples
    this.updateAvailableBiosamples();
    this.updateAvailableTypes();
    this.updateAvailableTargets();
  }

  render() {
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
    const {
      availableTypes,
      availableBiosamples,
      availableTargets,
      checked
    } = this.state;
    const genomeTypeItems = [<MenuItem value={null} primaryText="" key={-1} />];
    for (let i = 0; i < availableTypes.length; i++) {
      genomeTypeItems.push(
        <MenuItem value={i} key={i} primaryText={availableTypes[i]} />
      );
    }
    const biosampleItems = [<MenuItem value={null} primaryText="" key={-1} />];
    for (let i = 0; i < availableBiosamples.length; i++) {
      biosampleItems.push(
        <MenuItem value={i} key={i} primaryText={availableBiosamples[i]} />
      );
    }
    const targetCheckboxes = [];
    for (let i = 0; i < availableTargets.length; i++) {
      targetCheckboxes.push(
        <Checkbox
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
          value={this.state.genomeTypeValue}
          floatingLabelText="Type"
          onChange={this.handleUpdateType}
          maxHeight={200}
          errorText={this.state.genomeTypeValue === null ? "Pick one" : null}
        >
          {genomeTypeItems}
        </SelectField>{" "}
        <br /> <br />
        {targetCheckboxes && (
          <div>
            <div className="item-header"> Target </div>
            <Divider />
            <div className="target-selections">{targetCheckboxes}</div>
          </div>
        )}
        <SelectField
          value={this.state.chromoNameValue}
          floatingLabelText="Chromosome"
          onChange={this.handleUpdateChromName}
          maxHeight={200}
        >
          {this.chromoNameItems}
        </SelectField>
        <br /> <br />
        <div className="item-header">
          {" "}
          {"Length > "} {this.state.minLength}{" "}
        </div>
        <Slider
          min={0}
          max={100}
          step={1}
          value={this.state.minLength}
          onChange={this.handleUpdateMinLength}
        />
        <div className="item-header">
          {" "}
          {"Max Number of Results: "} {this.state.maxnumber}{" "}
        </div>
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
          style={{ position: "absolute", bottom: "10px", width: "90%" }}
        />
      </div>
    );
  }
}

ENCODESelector.propTypes = {
  appModel: PropTypes.object
};

export default ENCODESelector;
