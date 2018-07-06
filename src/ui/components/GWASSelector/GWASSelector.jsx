// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import TextField from "material-ui/TextField";
import AutoComplete from "material-ui/AutoComplete";
import Slider from "material-ui/Slider";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import SelectField from "material-ui/SelectField";
import MenuItem from "material-ui/MenuItem";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails.jsx";
import QueryBuilder, { QUERY_TYPE_INFO } from "../../models/query.js";
import {
  DATA_SOURCE_GWAS,
  DATA_SOURCE_CLINVAR
} from "../../helpers/constants";

// Styles
import "./GWASSelector.scss";

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
      traits: ["cancer", "Alzheimer", "sleep", "pain", "hair color", "asthma"],
      pvalue: 0.05,
      maxnumber: 10000
    };
  }

  updateTraits = (value) => {
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    if (value === 1) {
      builder.filterSource(DATA_SOURCE_GWAS);
    } else if (value === 2) {
      builder.filterSource(DATA_SOURCE_CLINVAR);
    }
    builder.filterType("trait");
    const infoQuery = builder.build();
    this.api.getDistinctValues("name", infoQuery).then(data => {
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

  handleUpdateTitle = (event) => {
    this.setState({
      title: event.target.value,
      fixTitle: true
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

  handleUpdateSearchSource = (event, index, value) => {
    this.setState({
      searchSourceValue: value
    });
    this.updateTraits(value);
  }

  handleUpdatePValue = (event, value) => {
    this.setState({
      pvalue: value
    });
  }

  handleUpdateMaxNumber = (event, value) => {
    this.setState({
      maxnumber: transform(value)
    });
  }

  buildGWASQuery() {
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    if (this.state.searchSourceValue === 1) {
      builder.filterSource(DATA_SOURCE_GWAS);
    } else if (this.state.searchSourceValue === 2) {
      builder.filterSource(DATA_SOURCE_CLINVAR);
    }
    builder.filterType("trait");
    builder.searchText(this.state.searchTrait);
    const infoQuery = builder.build();
    builder.newEdgeQuery();
    if (this.state.searchSourceValue === 1) {
      builder.filterSource(DATA_SOURCE_GWAS);
    } else if (this.state.searchSourceValue === 2) {
      builder.filterSource(DATA_SOURCE_CLINVAR);
    }
    builder.filterMaxPValue(this.state.pvalue);
    builder.setToNode(infoQuery);
    const edgeQuery = builder.build();
    builder.newGenomeQuery();
    if (this.state.searchSourceValue === 1) {
      builder.filterSource(DATA_SOURCE_GWAS);
    } else if (this.state.searchSourceValue === 2) {
      builder.filterSource(DATA_SOURCE_CLINVAR);
    }
    builder.addToEdge(edgeQuery);
    builder.setLimit(this.state.maxnumber);
    const genomeQuery = builder.build();
    return genomeQuery;
  }

  addQueryTrack() {
    const query = this.buildGWASQuery();
    this.appModel.trackMixPanel('Add GWAS Track', { 'query': query });
    this.appModel.addAnnotationTrack(this.state.title, query);
  }


  componentDidMount() {
    this.availableSourceNames = ['Any', 'GWAS', 'ClinVar'];
    this.searchSourceItems = [];
    for (let i = 0; i < this.availableSourceNames.length; i++) {
      this.searchSourceItems.push(<MenuItem value={i} key={i} primaryText={this.availableSourceNames[i]} />);
    }
    this.setState({
      searchSourceValue: 0,
    });
    this.updateTraits(0);
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
        <SelectField
          value={this.state.searchSourceValue}
          floatingLabelText="Data Source"
          onChange={this.handleUpdateSearchSource}
        >
          {this.searchSourceItems}
        </SelectField>
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
