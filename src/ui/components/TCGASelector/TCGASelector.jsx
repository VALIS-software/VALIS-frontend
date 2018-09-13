// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import SelectField from "material-ui/SelectField";
import MenuItem from "material-ui/MenuItem";
import { QueryBuilder } from 'valis'
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";
import { SiriusApi } from 'valis';
import { DATA_SOURCE_TCGA } from "../../helpers/constants";
import { App } from '../../../App';

// Styles
import "./TCGASelector.scss";


class TCGASelector extends React.Component {
  constructor(props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
      this.api = this.appModel.api;
    }
    this.state = {
      title: "",
      biosampleValue: null,
      availableBiosamples: [],
      variantTagValue: null,
      availableVariantTags: [],
    };
  }

  updateAvailableBiosamples = () => {
    if (this.selectedBiosample) return;
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterSource(DATA_SOURCE_TCGA);
    const infoQuery = builder.build();
    SiriusApi.getDistinctValues('info.biosample', infoQuery).then(data => {
      // Keep the current selection of biosample
      let newBiosampleValue = null;
      if (this.state.biosampleValue !== null) {
        const currentBiosample = this.state.availableBiosamples[this.state.biosampleValue];
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


  handelUpdateBiosample = (event, index, value) => {
    this.setState({
      biosampleValue: value
    });
    if (!this.state.fixTitle) {
      const newTitle =
        value === null ? "" : this.state.availableBiosamples[value];
      this.setState({
        title: newTitle
      });
    }
  }

  updateAvailableVariantTags = () => {
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterSource(DATA_SOURCE_TCGA);
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
    builder.filterType({'$in': ['SNP', 'variant']});
    builder.filterSource(DATA_SOURCE_TCGA);
    const biosample = this.state.availableBiosamples[this.state.biosampleValue];
    builder.filterBiosample(biosample);
    if (this.state.variantTagValue !== null) {
      const variantTag = this.state.availableVariantTags[this.state.variantTagValue];
      builder.filterVariantTag(variantTag);
    }
    return builder.build();
  }

  addQueryTrack = () => {
    const query = this.buildQuery();
    this.appModel.trackMixPanel("Add TCGA Track", { "query": query });
    const biosample = this.state.availableBiosamples[this.state.biosampleValue];
    let variantTag = '';
    if (this.state.variantTagValue !== null) {
      variantTag = this.state.availableVariantTags[this.state.variantTagValue];
    }
    App.addVariantTrack(`${biosample} ${variantTag} (TCGA)`, query);
    this.props.viewModel.closeNavigationView();
  }

  componentDidMount() {
    // use api to pull all available biosamples and variant_tags for TCGA
    this.updateAvailableBiosamples();
    this.updateAvailableVariantTags();
  }

  render() {
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
    const {
      availableBiosamples,
      availableVariantTags,
    } = this.state;

    const biosampleItems = [<MenuItem value={null} primaryText="" key={-1} />];
    for (let i = 0; i < availableBiosamples.length; i++) {
      biosampleItems.push(
        <MenuItem value={i} key={i} primaryText={availableBiosamples[i]} />
      );
    }

    const variantTagItems = [<MenuItem value={null} primaryText="" key={-1} />];
    for (let i = 0; i < availableVariantTags.length; i++) {
      variantTagItems.push(
        <MenuItem value={i} key={i} primaryText={availableVariantTags[i]} />
      );
    }

    return (
      <div className="track-editor">
        <SelectField
          value={this.state.biosampleValue}
          floatingLabelText="Biosample"
          onChange={this.handelUpdateBiosample}
          maxHeight={200}
          errorText={this.state.biosampleValue === null ? "Pick one" : null}
        >
          {biosampleItems}
        </SelectField>
        <br/>
        <SelectField
          value={this.state.variantTagValue}
          floatingLabelText="Variant Tag"
          onChange={this.handelUpdateVariantTag}
          maxHeight={200}
        >
          {variantTagItems}
        </SelectField>
        <br/>
        <RaisedButton
          label="Add Track"
          primary={true}
          onClick={() => this.addQueryTrack()}
          disabled={this.state.biosampleValue === null}
          style={{ position: "absolute", bottom: "10px", width: "90%" }}
        />
      </div>
    );
  }
}

TCGASelector.propTypes = {
  appModel: PropTypes.object
};

export default TCGASelector;
