// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import SelectField from "material-ui/SelectField";
import MenuItem from "material-ui/MenuItem";
import QueryBuilder from "../../../../lib/sirius/QueryBuilder";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails.jsx";

import { DATA_SOURCE_TCGA } from "../../../ui/helpers/constants";

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
    };
  }

  updateAvailableBiosamples = () => {
    if (this.selectedBiosample) return;
    const builder = new QueryBuilder();
    builder.newGenomeQuery();
    builder.filterType('SNP');
    builder.filterSource(DATA_SOURCE_TCGA);
    
    const distinctQuery = builder.build();
    this.api.getDistinctValues('info.tumor_tissue_sites', distinctQuery).then(data => {
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


  buildQuery = () => {
    
  }

  addQueryTrack = () => {
    const query = this.buildQuery();
    this.appModel.trackMixPanel("Add TCGA Track", { "query": query });
    this.appModel.addAnnotationTrack(this.state.title, query);
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

    const biosampleItems = [<MenuItem value={null} primaryText="" key={-1} />];
    for (let i = 0; i < availableBiosamples.length; i++) {
      biosampleItems.push(
        <MenuItem value={i} key={i} primaryText={availableBiosamples[i]} />
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
        <RaisedButton
          label="Add Track"
          primary={true}
          onClick={() => this.addQueryTrack()}
          disabled={!this.state.title}
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
