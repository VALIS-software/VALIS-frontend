// Dependencies
import MenuItem from "material-ui/MenuItem";
import RaisedButton from "material-ui/RaisedButton";
import Select from 'react-select';
import SelectField from "material-ui/SelectField";
import * as React from "react";
import { SiriusApi, QueryBuilder  } from 'valis';
import App from "../../../App";
import { DATA_SOURCE_IMMUNE_ATLAS } from "../../helpers/constants";
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
  availableBiosamples: Array<any>,
  checked: Array<any>,
}

class ImmuneAtlasSelector extends React.Component<Props, State> {

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
      availableBiosamples: [],
      checked: [],
      error: undefined,
    };
  }

  updateAvailableBiosamples = () => {
    if (this.selectedBiosample) return;
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterSource(DATA_SOURCE_IMMUNE_ATLAS);

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


  handleUpdateBiosample = (value: any) => {
    this.setState({
      biosampleValue: value,
    });
  }


  buildTitle() {
    const biosample = this.state.biosampleValue;
    return `${biosample}`;
  }

  buildQuery = () => {
    const builder = new QueryBuilder();
    builder.newGenomeQuery();
    builder.filterBiosample(this.state.biosampleValue);
    builder.filterSource(DATA_SOURCE_IMMUNE_ATLAS);
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
      availableBiosamples,
    } = this.state;
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
        <RaisedButton
          label="Add Track"
          primary={true}
          onClick={() => this.addQueryTrack()}
          disabled={this.state.biosampleValue === null}
          style={{ position: "absolute", left: "0px", bottom: "10px", paddingLeft:"5%", paddingRight:"5%", width: "100%" }}
        />
      </div>
    );
  }
}

export default ImmuneAtlasSelector;
