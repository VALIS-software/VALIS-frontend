// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import Select from 'react-select';
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
      variantTagValue: [],
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

  handleUpdateVariantTags = (value) => {
    this.setState({
      variantTagValue: value.map(d => d.value),
    });
  }


  buildQuery = () => {
    const builder = new QueryBuilder();
    builder.newGenomeQuery();
    builder.filterSource(DATA_SOURCE_ExAC);
    builder.filterVariantTag(this.state.variantTagValue);
    return builder.build();
  }

  addQueryTrack = () => {
    const query = this.buildQuery();
    this.appModel.trackMixPanel("Add ExAC Track", { "query": query });
    const tagValue = this.state.variantTagValue.length === 1 ? this.state.variantTagValue[0] : this.state.variantTagValue.join(', ');
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

    const variantTagItems = availableVariantTags.map(d => { return { label: d, value: d } });
    return (
      <div className="track-editor">
        <Select
          onChange={d => this.handleUpdateVariantTags(d)}
          options={variantTagItems}
          placeholder='Choose variant types'
          isMulti={true}
        />
        <br />
        <RaisedButton
          label="Add Track"
          primary={true}
          onClick={() => this.addQueryTrack()}
          disabled={this.state.variantTagValue.length === 0}
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
