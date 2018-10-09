// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import AutoComplete from "material-ui/AutoComplete";
import Slider from "material-ui/Slider";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";
import { QueryBuilder } from 'valis'
import {
  DATA_SOURCE_GWAS,
} from "../../helpers/constants";
import { SiriusApi } from 'valis';
import { App } from '../../../App';
// Styles
import "./GWASSelector.scss";

const logmin = 0;
const logmax = 0.01;
const power = 30;

function transform(value) {
  return (Math.exp(power * value / logmax) - 1) / (Math.exp(power) - 1) * logmax;
}

function reverse(value) {
  return (1 / power) * Math.log(((Math.exp(power) - 1) * value / logmax) + 1) * logmax;
}

class GWASSelector extends React.Component {
  constructor(props) {
    super(props);
    this.appModel = props.appModel;
    this.viewModel = props.viewModel;
    this.api = this.appModel.api;

    this.state = {
      title: "",
      searchTrait: "",
      searchSourceValue: 0,
      traits: [],
      pvalue: 0.01,
    };
  }

  componentDidMount() {
    this.updateTraits();
  }


  updateTraits = () => {
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterSource(DATA_SOURCE_GWAS);
    builder.filterType("trait");
    const infoQuery = builder.build();
    SiriusApi.getDistinctValues("name", infoQuery).then(data => {
      this.setState({
        traits: data
      });
    }, (err) => {
      this.appModel.error(this, err);
      this.setState({
        error: err,
      });
    });
  }

  handleUpdateTraitInput = (searchText) => {
    this.setState({
      searchTrait: searchText
    });
    if (!this.state.fixTitle) {
      this.setState({
        title: searchText
      });
    }
  }

  handleUpdatePValue = (event, value) => {
    this.setState({
      pvalue: transform(value)
    });
  }

  buildGWASQuery() {
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterSource(DATA_SOURCE_GWAS);
    builder.filterType("trait");
    builder.searchText(this.state.searchTrait);
    const infoQuery = builder.build();
    builder.newEdgeQuery();
    builder.filterSource(DATA_SOURCE_GWAS);
    builder.filterMaxPValue(this.state.pvalue);
    builder.setToNode(infoQuery);
    const edgeQuery = builder.build();
    builder.newGenomeQuery();
    builder.filterSource(DATA_SOURCE_GWAS);
    builder.addToEdge(edgeQuery);
    builder.setLimit(1000000);
    const genomeQuery = builder.build();
    return genomeQuery;
  }

  addQueryTrack() {
    const query = this.buildGWASQuery();
    this.appModel.trackMixPanel('Add GWAS Track', { 'query': query });
    App.addVariantTrack(this.state.title, query);
    this.props.viewModel.closeNavigationView();
  }

  render() {
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
    return (
      <div className="track-editor">
        <AutoComplete
          floatingLabelText="Trait"
          searchText={this.state.searchTrait}
          filter={AutoComplete.fuzzyFilter}
          maxSearchResults={10}
          hintText="Type anything"
          dataSource={this.state.traits}
          onUpdateInput={this.handleUpdateTraitInput}
          errorText={!this.state.searchTrait ? "This field is required" : ""}
        />
        <br /> <br />
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
          disabled={this.state.searchSourceValue === 2}
        />
        <RaisedButton
          label="Add Track"
          primary={true}
          onClick={() => this.addQueryTrack()}
          disabled={!(this.state.searchTrait && this.state.title)}
          style={{ position: "absolute", bottom: "10px", width: "90%" }}
        />
      </div>
    );
  }
}

GWASSelector.propTypes = {
  appModel: PropTypes.object,
  viewModel: PropTypes.object
};

export default GWASSelector;
