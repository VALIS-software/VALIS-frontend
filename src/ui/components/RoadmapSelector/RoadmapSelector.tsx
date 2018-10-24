// Dependencies
import MenuItem from "material-ui/MenuItem";
import RaisedButton from "material-ui/RaisedButton";
import Select from 'react-select';
import SelectField from "material-ui/SelectField";
import * as React from "react";
import { SiriusApi, QueryBuilder  } from 'valis';
import App from "../../../App";
import { DATA_SOURCE_ROADMAP } from "../../helpers/constants";
import AppModel from "../../../model/AppModel";
import ViewModel from "../../../model/ViewModel";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";


type Props = {
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
  checked: Array<any>,
}

class RoadmapSelector extends React.Component<Props, State> {

  appModel: AppModel;
  selectedBiosample: any;
  selectedType: any;
  selectedTargets: any;

  constructor(props: Props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
    }
    this.state = {
      biosampleValue: null,
      genomeTypeValue: null,
      chromoNameValue: 0,
      maxnumber: 1000000,
      availableTypes: [],
      availableBiosamples: [],
      checked: [],
      error: undefined,
    };
  }

  updateAvailableBiosamples = () => {
    if (this.selectedBiosample) return;
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterSource(DATA_SOURCE_ROADMAP);
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
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterSource(DATA_SOURCE_ROADMAP);
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


  handleUpdateBiosample = (value: any) => {
    this.setState({
      biosampleValue: value,
      availableTypes: [],
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
    });
    // Update the available biosample and targets
    if (value !== null) {
      this.selectedType = this.state.availableTypes[value];
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
    return `${biosample} ${genomeType}`;
  }

  buildQuery = () => {
    const builder = new QueryBuilder();
    builder.newGenomeQuery();
    const genomeType = this.state.availableTypes[this.state.genomeTypeValue];
    builder.filterType(genomeType);
    const biosample = this.state.availableBiosamples[this.state.biosampleValue];
    builder.filterBiosample(biosample);
    builder.setLimit(this.state.maxnumber);
    const genomeQuery = builder.build();
    return genomeQuery;
  }

  addQueryTrack = () => {
    const query = this.buildQuery();
    this.appModel.trackMixPanel("Add Roadmap Track", { "query": query });
    App.addIntervalTrack(this.buildTitle(), query);
    this.props.viewModel.closeNavigationView();
  }

  componentDidMount() {
    // use api to pull all available biosamples
    this.updateAvailableBiosamples();
  }

  render() {
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
    const {
      availableTypes,
      availableBiosamples,
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
        <RaisedButton
          label="Add Track"
          primary={true}
          onClick={() => this.addQueryTrack()}
          disabled={this.state.biosampleValue === null || this.state.genomeTypeValue === null}
          style={{ position: "absolute", left: "0px", bottom: "10px", paddingLeft:"5%", paddingRight:"5%", width: "100%" }}
        />
      </div>
    );
  }
}

export default RoadmapSelector;
