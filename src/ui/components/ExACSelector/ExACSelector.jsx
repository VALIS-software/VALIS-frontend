// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import AutoComplete from "material-ui/AutoComplete";
import SelectField from "material-ui/SelectField";
import MenuItem from "material-ui/MenuItem";
import QueryBuilder from "sirius/QueryBuilder";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";

import { VARIANT_TAGS, DATA_SOURCE_ExAC } from "../../helpers/constants";
import { SiriusApi } from "sirius/SiriusApi";
import { App } from '../../../App';

class ExACSelector extends React.Component {
  constructor(props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
      this.api = this.appModel.api;
    }
    this.state = {
      variantTagValue: null,
      availableVariantTags: VARIANT_TAGS,
    };
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
    builder.filterVariantTag(this.state.availableVariantTags[this.state.variantTagValue]);
  }

  addQueryTrack = () => {
    const query = this.buildQuery();
    this.appModel.trackMixPanel("Add ExAC Track", { "query": query });
    // QYD: The results of this query is "Edges" instead of GenomeNodes, we might need a new method for displaying
    const tagValue = this.state.availableVariantTags[this.state.variantTagValue];
    App.addVariantTrack(`${tagValue} (ExAC)`, query);
    this.props.viewModel.closeView();
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
          disabled={!this.state.variantTagValue}
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
