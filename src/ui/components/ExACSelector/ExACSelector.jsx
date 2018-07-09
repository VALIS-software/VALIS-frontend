// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import AutoComplete from "material-ui/AutoComplete";
import SelectField from "material-ui/SelectField";
import MenuItem from "material-ui/MenuItem";
import QueryBuilder from "../../models/query.js";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails.jsx";

import { VARIANT_TAGS, DATA_SOURCE_ExAC } from "../../../ui/helpers/constants";

class ExACSelector extends React.Component {
  constructor(props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
      this.api = this.appModel.api;
    }
    this.state = {
      genes: [],
      variantTagValue: null,
      availableVariantTags: VARIANT_TAGS,
    };
  }

  handleUpdateGeneInput = (searchText, dataSource, params) => {
    if (searchText === '') {
      this.setState({
        searchGene: '',
        genes: [],
      });
      return;
    }
    this.setState({
      searchGene: searchText
    });
    if (params.source === "click") return;
    this.appModel.api.getSuggestions('GENE', searchText, 10).then(results => {
      this.setState({
        genes: results,
      });
    });
  }

  handelUpdateVariantTag = (event, index, value) => {
    this.setState({
      variantTagValue: value
    });
    if (!this.state.fixTitle) {
      const newTitle =
        value === null ? "" : this.state.availableVariantTags[value];
      this.setState({
        title: newTitle
      });
    }
  }


  buildQuery = () => {
    const builder = new QueryBuilder();
    builder.newGenomeQuery();
    builder.filterSource(DATA_SOURCE_ExAC);
    builder.filterAffectedGene(this.state.searchGene);
    builder.filterVariantTag(this.state.variantTagValue);
  }

  addQueryTrack = () => {
    const query = this.buildQuery();
    this.appModel.trackMixPanel("Add ExAC Track", { "query": query });
    this.appModel.addAnnotationTrack(this.state.title, query);
  }

  render() {
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
    const {
      availableVariantTags,
    } = this.state;

    const variantTagItems = [<MenuItem value={null} primaryText="" key={-1} />];
    for (let i = 0; i < availableVariantTags.length; i++) {
      variantTagItems.push(
        <MenuItem value={i} key={i} primaryText={availableVariantTags[i]} />
      );
    }
    return (
      <div className="track-editor">
        <AutoComplete
          floatingLabelText="Gene"
          searchText={this.state.searchGene}
          filter={AutoComplete.fuzzyFilter}
          maxSearchResults={10}
          hintText="Type a gene name"
          menuCloseDelay={0}
          dataSource={this.state.genes}
          onUpdateInput={this.handleUpdateGeneInput}
          errorText={!this.state.searchGene ? "This field is required" : ""}
        />
        <br /> <br />
        <SelectField
          value={this.state.variantTagValue}
          floatingLabelText="Variant Tag"
          onChange={this.handelUpdateVariantTag}
          maxHeight={200}
          errorText={this.state.variantTagValue === null ? "Pick one" : null}
        >
          {variantTagItems}
        </SelectField>
        <RaisedButton
          label="Add Track"
          primary={true}
          onClick={() => this.addQueryTrack()}
          disabled={!this.state.variantTagValue || !this.state.searchGene}
          style={{width: '95%'}}
        />
      </div>
    );
  }
}

ExACSelector.propTypes = {
  appModel: PropTypes.object
};

export default ExACSelector;
