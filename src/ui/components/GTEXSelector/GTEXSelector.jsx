// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import CircularProgress from "material-ui/CircularProgress";
import Slider from "material-ui/Slider";
import SelectField from "material-ui/SelectField";
import Select from 'react-select';
import MenuItem from "material-ui/MenuItem";
import { QueryBuilder } from 'valis'
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";
import { SiriusApi } from 'valis';
import { App } from '../../../App';

import { DATA_SOURCE_GTEX } from "../../helpers/constants";

let biosamplesCached = null;

const logmin = 0;
const logmax = 0.01;
const power = 30;

function transform(value) {
  return (Math.exp(power * value / logmax) - 1) / (Math.exp(power) - 1) * logmax;
}

function reverse(value) {
  return (1 / power) * Math.log(((Math.exp(power) - 1) * value / logmax) + 1) * logmax;
}

class GTEXSelector extends React.Component {
  constructor(props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
      this.api = this.appModel.api;
    }
    this.state = {
      title: "",
      biosampleValue: null,
      pvalue: 0.01,
      loading: true,
      availableBiosamples: [],
    };
  }

  updateAvailableBiosamples = () => {
    if (this.selectedBiosample) return;
    if (biosamplesCached) {
      this.setState({
        availableBiosamples: biosamplesCached,
        loading: false,
        biosampleValue: null,
      });
    } else {
      const builder = new QueryBuilder();
      builder.newInfoQuery();
      builder.filterSource(DATA_SOURCE_GTEX);
      const infoQuery = builder.build();
      SiriusApi.getDistinctValues('info.biosample', infoQuery).then(data => {
        biosamplesCached = data;
        this.setState({
          availableBiosamples: data,
          loading: false,
          biosampleValue: null,
        });
      }, err => {
        this.appModel.error(this, err);
        this.setState({
          error: err,
          loading: false,
        });
      });
    }
  }

  handleUpdatePValue = (event, value) => {
    this.setState({
      pvalue: transform(value)
    });
  }

  handleUpdateBioSample = (value) => {
    this.setState({
      biosampleValue: value.map(d=> d.value)
    });
  }


  buildQuery = () => {
    const builder = new QueryBuilder();
    builder.newEdgeQuery();
    builder.filterSource(DATA_SOURCE_GTEX);
    builder.filterBiosample(this.state.biosampleValue);
    builder.filterMaxPValue(this.state.pvalue);
    const edgeQuery = builder.build();
    builder.newGenomeQuery();
    builder.addToEdge(edgeQuery);
    return builder.build();
  }

  addQueryTrack = () => {
    const query = this.buildQuery();
    this.appModel.trackMixPanel("Add GTEX Track", { "query": query });
    const biosample = this.state.biosampleValue.length === 1 ? this.state.biosampleValue[0] : this.state.biosampleValue.join(', ');
    // QYD: The results of this query is "Edges" instead of GenomeNodes, we might need a new method for displaying
    App.addVariantTrack(`${biosample} eQTLs`, query);
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
    if (this.state.loading) {
      return (<div className="navigation-controller-loading">
        <CircularProgress size={80} thickness={5} />
      </div>);
    }

    const {
      availableBiosamples,
    } = this.state;

    const biosampleItems = availableBiosamples.map(d => { return {label: d, value: d} });
    return (
      <div className="track-editor">
        <Select
          onChange={d => this.handleUpdateBioSample(d)}
          options={biosampleItems}
          placeholder='Choose Biosample(s)'
          isMulti={true}
        />
        <br/>
        <br/>
        <div>
          {" "}
          {"P-Value < "} {this.state.pvalue.toExponential(3)}{" "}
        </div>
        <Slider
          min={logmin}
          max={logmax}
          step={(logmax - logmin) / 200}
          value={reverse(this.state.pvalue)}
          onChange={this.handleUpdatePValue}
        />
        <br />
        <RaisedButton
          label="Add Track"
          primary={true}
          onClick={() => this.addQueryTrack()}
          disabled={!this.state.biosampleValue || this.state.biosampleValue.length === 0}
          style={{ position: "absolute", bottom: "10px", width: "90%" }}
        />
      </div>
    );
  }
}

GTEXSelector.propTypes = {
  appModel: PropTypes.object
};

export default GTEXSelector;
