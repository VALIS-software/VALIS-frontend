// Dependencies

import TableView from '../Shared/TableView/TableView';
import MenuItem from "material-ui/MenuItem";
import Select from 'react-select';
import SelectField from "material-ui/SelectField";
import * as React from "react";
import { SiriusApi, QueryBuilder  } from 'valis';
import App from "../../../App";
import { DATA_SOURCE_ENCODEbigwig } from "../../helpers/constants";
import AppModel from "../../../model/AppModel";
import ViewModel from "../../../model/ViewModel";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";
// Styles
import "./ENCODESignalSelector.scss";

type Props = {
  biosample?: string,
  appModel: AppModel,
  viewModel: ViewModel,
}

type State = {
  biosampleValue: any,
  targetValue: any,
  error: any,
  genomeTypeValue: any,
  chromoNameValue: number,
  maxnumber: number,
  availableTypes: Array<any>,
  availableBiosamples: Array<any>,
  availableTargets: Array<any>,
}

class ENCODESignalSelector extends React.Component<Props, State> {

  appModel: AppModel;
  selectedBiosample: any;
  selectedType: any;
  availableChromoNames: Array<string>;

  constructor(props: Props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
    }
    this.state = {
      biosampleValue: props.biosample || null,
      genomeTypeValue: null,
      targetValue: null,
      chromoNameValue: 0,
      maxnumber: 1000000,
      availableTypes: [],
      availableBiosamples: [],
      availableTargets: [],
      error: undefined,
    };
    this.selectedBiosample = props.biosample;
  }


  renderRow = (signalTrack: any) => {
    const desc = `${signalTrack.info.lab}, ${signalTrack.info.output_type}, ${signalTrack.info.experiment_target}`;
    return (<div className='table-row'>
        <div className='table-row-title'>{signalTrack.name} ({signalTrack.info.assay}) </div>
        <div className='table-row-description'>{desc} </div>
    </div>);
  }

  clickRow = (signalData: any) => {
    const target = signalData.info.experiment_target;
    let title = `${signalData.info.biosample}, ${signalData.info.assay} ${target}`;
    if (!target) title = `${signalData.info.biosample}, ${signalData.info.assay}`;
    App.addSignalTrack(title, signalData.info.fileurl);
  }

  updateAvailableBiosamples = () => {
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterSource(DATA_SOURCE_ENCODEbigwig);
    const infoQuery = builder.build();
    infoQuery.filters['info.assembly'] = 'GRCh38';
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
    builder.filterSource(DATA_SOURCE_ENCODEbigwig);
    if (this.selectedBiosample) {
      builder.filterBiosample(this.selectedBiosample);
    }
    const infoQuery = builder.build();
    infoQuery.filters['info.assembly'] = 'GRCh38';
    SiriusApi.getDistinctValues("info.assay", infoQuery).then(data => {
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
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterSource(DATA_SOURCE_ENCODEbigwig);
    if (this.selectedBiosample) {
      builder.filterBiosample(this.selectedBiosample);
    }
    const infoQuery = builder.build();
    infoQuery.filters['info.assay'] = this.selectedType;
    infoQuery.filters['info.assembly'] = 'GRCh38';
    SiriusApi.getDistinctValues("info.experiment_target", infoQuery).then(data => {
      // Keep the current selection of targets
      this.setState({
        availableTargets: data,
      });
    }, err => {
      this.appModel.error(this, err);
    });
  }

  handleUpdateTarget = (value: any) => {
    this.setState({
      targetValue: value,
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

  handleUpdateAssayType = (event: any, index: number, value: any) => {
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

  buildTitle() {
    const biosample = this.state.biosampleValue;
    const target = this.state.targetValue;
    const genomeType = this.state.availableTypes[this.state.genomeTypeValue];
    return `${biosample} ${genomeType} (${target})`;
  }

  componentDidMount() {
    // use api to pull all available biosamples
    this.updateAvailableBiosamples();
  }

  componentWillReceiveProps(nextProps: any) {
    this.handleUpdateBiosample(nextProps.biosample);
  }

  buildSignalQuery = () => {
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterSource(DATA_SOURCE_ENCODEbigwig);
    if (this.selectedBiosample) {
      builder.filterBiosample(this.selectedBiosample);
    }
    const infoQuery = builder.build();
    if (this.selectedType) infoQuery.filters['info.assay'] = this.selectedType;
    if (this.state.targetValue) infoQuery.filters['info.experiment_target'] = this.state.targetValue;
    infoQuery.filters['info.assembly'] = 'GRCh38';
    return infoQuery;
  }

  fetchFunction = (start: number, end: number)  => {
    return SiriusApi.getQueryResults(this.buildSignalQuery(), true, start, end);
}

  render() {
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
    const {
      availableTypes,
      availableBiosamples,
      availableTargets,
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


    const targetItems = [];
    for (let i = 0; i < availableTargets.length; i++) {
      targetItems.push(
        { label: availableTargets[i], value: availableTargets[i]}
      );
    }
    const currentTargetValue = this.state.targetValue ? {
      label: this.state.targetValue,
      value: this.state.targetValue,
    } : null;

    const fetchFunction = this.fetchFunction.bind(this);
    const filterState = `${this.state.biosampleValue}|${this.state.targetValue}|${this.state.genomeTypeValue}`;

    return (
      <div className="signal-track-editor">
        <div style={{padding: 15}}>
        <Select
          value={currentValue}
          onChange={(d: any) => this.handleUpdateBiosample(d.value)}
          options={biosampleItems}
          placeholder='Choose a cell type'
        />
        {
          this.state.availableTypes.length > 1 ? (<SelectField
            value={this.state.genomeTypeValue}
            floatingLabelText="Choose Assay"
            onChange={this.handleUpdateAssayType}
            maxHeight={200}
            errorText={this.state.genomeTypeValue === null ? "Pick one" : null}
          >
            {genomeTypeItems}
          </SelectField>) : null
        }
        {
          this.state.availableTargets.length > 1 ? (<Select
            value={currentTargetValue}
            onChange={(d: any) => this.handleUpdateTarget(d.value)}
            options={targetItems}
            placeholder='Choose experiment target'
          />) : null
        }
        {" "}
        <br/>
        </div>
        <TableView fetchId={filterState} fetch={fetchFunction} rowRenderer={this.renderRow} onClick={this.clickRow}/>
      </div>
    );
  }
}

export default ENCODESignalSelector;
