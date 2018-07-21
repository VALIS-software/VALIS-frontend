// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import AutoComplete from "material-ui/AutoComplete";
import Slider from "material-ui/Slider";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import SelectField from "material-ui/SelectField";
import MenuItem from "material-ui/MenuItem";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";
import QueryBuilder from "sirius/QueryBuilder";
import {
  DATA_SOURCE_GWAS,
} from "../../helpers/constants";
import SiriusApi from "sirius/SiriusApi";
import { App } from '../../../App';
// Styles
import "./GWASSelector.scss";

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
      pvalue: 0.05,
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
      pvalue: value
    });
  }

  buildGWASQuery() {
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterType("trait");
    builder.searchText(this.state.searchTrait);
    const infoQuery = builder.build();
    builder.newEdgeQuery();
    builder.filterMaxPValue(this.state.pvalue);
    builder.setToNode(infoQuery);
    const edgeQuery = builder.build();
    builder.newGenomeQuery();
    builder.addToEdge(edgeQuery);
    builder.setLimit(100000000);
    const genomeQuery = builder.build();
    return genomeQuery;
  }

  addQueryTrack() {
    const query = this.buildGWASQuery();
    this.appModel.trackMixPanel('Add GWAS Track', { 'query': query });
    App.addVariantTrack(this.state.title, query);
    this.props.viewModel.closeView();
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
          filter={AutoComplete.caseInsensitiveFilter}
          maxSearchResults={10}
          hintText="Type anything"
          dataSource={this.state.traits}
          onUpdateInput={this.handleUpdateTraitInput}
          errorText={!this.state.searchTrait ? "This field is required" : ""}
        />
        <br /> <br />
        <div>
          {" "}
          {"P-Value < "} {this.state.pvalue}{" "}
        </div>
        <Slider
          min={0}
          max={0.1}
          step={0.001}
          value={this.state.pvalue}
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
