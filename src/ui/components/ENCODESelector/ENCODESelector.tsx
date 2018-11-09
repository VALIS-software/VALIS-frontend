// Dependencies
import Checkbox from "material-ui/Checkbox";
import Divider from "material-ui/Divider";
import MenuItem from "material-ui/MenuItem";
import RaisedButton from "material-ui/RaisedButton";
import Select from 'react-select';
import SelectField from "material-ui/SelectField";
import * as React from "react";
import { SiriusApi, QueryBuilder  } from 'valis';
import App from "../../../App";
import { CHROMOSOME_NAMES, DATA_SOURCE_ENCODE } from "../../helpers/constants";
import AppModel from "../../../model/AppModel";
import ViewModel from "../../../model/ViewModel";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";
// Styles
import "./ENCODESelector.scss";

type Props = {
  biosample?: string,
  appModel: AppModel,
  viewModel: ViewModel,
}

type State = {
  biosampleValue: any,
  error: any,
  genomeTypeValue: any,
  chromoNameValue: number,
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
      biosampleValue: props.biosample || null,
      genomeTypeValue: null,
      chromoNameValue: 0,
      maxnumber: 1000000,
      availableTypes: [],
      availableBiosamples: [],
      availableTargets: [],
      checked: [],
      error: undefined,
    };
    this.selectedBiosample = props.biosample;
  }

  updateAvailableBiosamples = () => {
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
        const currentBiosample = this.state.biosampleValue;
        newBiosampleValue = data.indexOf(currentBiosample);
        if (newBiosampleValue < 0) {
          newBiosampleValue = null;
        }
      }
      this.setState({
        availableBiosamples: data,
        biosampleValue: data[newBiosampleValue],
      });
      if (newBiosampleValue) {
        this.updateAvailableTypes();
      }
    }, err => {
      this.appModel.error(this, err);
      this.setState({
        error: err,
      });
    });
  }

  updateAvailableTypes = () => {
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterSource(DATA_SOURCE_ENCODE);
    builder.filterType("ENCODE_accession");
    if (this.selectedBiosample) {
      builder.filterBiosample(this.selectedBiosample);
    }
    const infoQuery = builder.build();
    SiriusApi.getDistinctValues("info.types", infoQuery).then(data => {
      // Keep the current selection of type

      this.setState({
        availableTypes: data,
        genomeTypeValue: null,
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

  handleUpdateBiosample = (value: any) => {
    this.setState({
      biosampleValue: value,
      availableTypes: [],
      availableTargets: [],
    });
    // Update the available types and targets
    if (value !== null) {
      this.selectedBiosample = value;
    }
    this.updateAvailableTypes();
  }

  handleUpdateType = (event: any, index: number, value: any) => {
    this.setState({
      genomeTypeValue: value,
      availableTargets: [],
    });
    // Update the available biosample and targets
    if (value !== null) {
      this.selectedType = this.state.availableTypes[value];
    }
    this.updateAvailableTargets();
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
  }

  handleUpdateChromName = (event: any, index: number, value: any) => {
    this.setState({
      chromoNameValue: value
    });
  }

  buildTitle() {
    const biosample = this.state.biosampleValue;
    const genomeType = this.state.availableTypes[this.state.genomeTypeValue];
    const targets = [];
    for (let i = 0; i < this.state.checked.length; i++) {
      if (this.state.checked[i] === true) {
        targets.push(this.state.availableTargets[i]);
      }
    }
    return `${biosample} ${genomeType}` + (targets.length ? ` (${targets.join(',')})` : '');
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
    const biosample = this.state.biosampleValue;
    builder.filterBiosample(biosample);
    const targets = [];
    for (let i = 0; i < this.state.checked.length; i++) {
      if (this.state.checked[i] === true) {
        targets.push(this.state.availableTargets[i]);
      }
    }
    builder.filterTargets(targets);
    builder.setLimit(this.state.maxnumber);
    const genomeQuery = builder.build();
    console.log(genomeQuery);
    return genomeQuery;
  }

  addQueryTrack = () => {
    const query = this.buildQuery();
    this.appModel.trackMixPanel("Add ENCODE Track", { "query": query });
    App.addIntervalTrack(this.buildTitle(), query);
  }

  componentDidMount() {
    // use api to pull all available biosamples
    this.updateAvailableBiosamples();
  }

  componentWillReceiveProps(nextProps: any) {
    this.handleUpdateBiosample(nextProps.biosample);
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
    const biosampleItems = [];
    for (let i = 0; i < availableBiosamples.length; i++) {
      biosampleItems.push(
        { label: availableBiosamples[i], value: availableBiosamples[i]}
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
    const currentValue = this.state.biosampleValue ? {
      label: this.state.biosampleValue,
      value: this.state.biosampleValue,
    } : null;

    return (
      <div className="track-editor">
        <Select
          value={currentValue}
          onChange={(d: any) => this.handleUpdateBiosample(d.value)}
          options={biosampleItems}
          placeholder='Choose a cell type'
        />{" "}
        <br />
        {
          this.state.availableTypes.length ? (<SelectField
            value={this.state.genomeTypeValue}
            floatingLabelText="Type"
            onChange={this.handleUpdateType}
            maxHeight={200}
            errorText={this.state.genomeTypeValue === null ? "Pick one" : null}
          >
            {genomeTypeItems}
          </SelectField>) : null
        }
        {" "}
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
