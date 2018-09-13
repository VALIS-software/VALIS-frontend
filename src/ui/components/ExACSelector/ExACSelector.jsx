// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import AutoComplete from "material-ui/AutoComplete";
import SelectField from "material-ui/SelectField";
import MenuItem from "material-ui/MenuItem";
import { QueryBuilder } from 'valis'
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";

import { DATA_SOURCE_ExAC } from "../../helpers/constants";
import { SiriusApi } from 'valis';
import { App } from '../../../App';

class ExACSelector extends React.Component {
  constructor(props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
    }
    this.state = {
      variantTagValue: null,
      availableVariantTags: [],
    };
  }

  updateAvailableVariantTags = () => {
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterSource(DATA_SOURCE_ExAC);
    const infoQuery = builder.build();
    SiriusApi.getDistinctValues('info.variant_tags', infoQuery).then(data => {
      this.setState({
        availableVariantTags: data,
        loading: false,
      });
    }, err => {
      this.appModel.error(this, err);
      this.setState({
        error: err,
        loading: false,
      });
    });
  }

  handelUpdateVariantTag = (event, index, value) => {
    this.setState({
      variantTagValue: value
    });
  }


  buildQuery = () => {
    const builder = new QueryBuilder();
    builder.newGenomeQuery();
    builder.filterSource(DATA_SOURCE_ExAC);
    builder.filterVariantTag(this.state.availableVariantTags[this.state.variantTagValue]);
    return builder.build();
  }

  addQueryTrack = () => {
    const query = this.buildQuery();
    this.appModel.trackMixPanel("Add ExAC Track", { "query": query });
    const tagValue = this.state.availableVariantTags[this.state.variantTagValue];
    App.addVariantTrack(`${tagValue} (ExAC)`, query);
    this.props.viewModel.closeNavigationView();
  }

  componentDidMount() {
    // use api to pull all available variant tags
    this.updateAvailableVariantTags();
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
        <br />
        <RaisedButton
          label="Add Track"
          primary={true}
          onClick={() => this.addQueryTrack()}
          disabled={this.state.variantTagValue === null}
          style={{ position: "absolute", bottom: "10px", width: "90%" }}
        />
      </div>
    );
  }
}

ExACSelector.propTypes = {
  appModel: PropTypes.object
};

export default ExACSelector;
