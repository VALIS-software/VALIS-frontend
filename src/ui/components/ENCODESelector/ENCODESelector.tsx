// Dependencies
import Checkbox from "material-ui/Checkbox";
import Divider from "material-ui/Divider";
import MenuItem from "material-ui/MenuItem";
import RaisedButton from "material-ui/RaisedButton";
import SelectField from "material-ui/SelectField";
import * as React from "react";
import QueryBuilder from "sirius/QueryBuilder";
import SiriusApi from "sirius/SiriusApi";
import App from "../../../App";
import { CHROMOSOME_NAMES, DATA_SOURCE_ENCODE } from "../../helpers/constants";
import AppModel from "../../models/AppModel";
import ViewModel from "../../models/ViewModel";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";
// Styles
import "./ENCODESelector.scss";

type Props = {
  appModel: AppModel,
  viewModel: ViewModel,
}

type State = {
  biosampleValue: any,
  error: any,
  genomeTypeValue: any,
  chromoNameValue: number,
  minLength: number,
  maxnumber: number,
  availableTypes: Array<any>,
  availableBiosamples: Array<any>,
  availableTargets: Array<any>,
  checked: Array<any>,
}

class ENCODESelector extends React.Component<Props, State> {

  appModel: AppModel;
  selectedBiosample: any;
  selectedType: any;
  selectedTargets: any;
  availableChromoNames: Array<string>;

  constructor(props: Props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
    }
    this.state = {
      biosampleValue: null,
      genomeTypeValue: null,
      chromoNameValue: 0,
      minLength: 10,
      maxnumber: 1000000,
      availableTypes: [],
      availableBiosamples: [],
      availableTargets: [],
      checked: [],
      error: undefined,
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
    SiriusApi.getDistinctValues("info.types", infoQuery).then(data => {
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
    SiriusApi.getDistinctValues("info.targets", infoQuery).then(data => {
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

  handelUpdateBiosample = (event: any, index: any, value: any) => {
    this.setState({
      biosampleValue: value
    });
    // Update the available types and targets
    if (value !== null) {
      this.selectedBiosample = this.state.availableBiosamples[value];
      this.updateAvailableTypes();
      this.updateAvailableTargets();
    }
  }

  handleUpdateType = (event: any, index: number, value: any) => {
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

  handleCheckBox = (index: number) => {
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

  handleUpdateChromName = (event: any, index: number, value: any) => {
    this.setState({
      chromoNameValue: value
    });
  }

  handleUpdateMinLength = (event: any, value: any) => {
    this.setState({
      minLength: value
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
    this.appModel.trackMixPanel("Add ENCODE Track", { "query": query });
    const biosample = this.state.availableBiosamples[this.state.biosampleValue];
    const genomeType = this.state.availableTypes[this.state.genomeTypeValue];
    const title = biosample + ' ' + genomeType;
    App.addIntervalTrack(title, query, (e) => {
      return {
        startIndex: e.start - 1,
        span: e.length
      }
    });
    this.props.viewModel.closeNavigationView();
  }

  componentDidMount() {
    this.availableChromoNames = ['Any'].concat(CHROMOSOME_NAMES);
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
        {targetCheckboxes.length > 0 && (
          <div>
            <div className="item-header"> Target </div>
            <Divider />
            <div className="target-selections">{targetCheckboxes}</div>
          </div>
        )}
        <RaisedButton
          label="Add Track"
          primary={true}
          onClick={() => this.addQueryTrack()}
          disabled={this.state.biosampleValue === null || this.state.genomeTypeValue === null}
          style={{ position: "absolute", bottom: "10px", width: "90%" }}
        />
      </div>
    );
  }
}

export default ENCODESelector;
