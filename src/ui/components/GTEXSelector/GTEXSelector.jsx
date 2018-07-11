// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import RaisedButton from "material-ui/RaisedButton/RaisedButton";
import CircularProgress from "material-ui/CircularProgress";
import Slider from "material-ui/Slider";
import SelectField from "material-ui/SelectField";
import MenuItem from "material-ui/MenuItem";
import QueryBuilder from "../../../../lib/sirius/QueryBuilder";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";

import { DATA_SOURCE_GTEX } from "../../helpers/constants";

let biosamplesCached = null;

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
      pvalue: 0.05,
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
      this.api.getDistinctValues('info.biosample', infoQuery).then(data => {
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
      pvalue: value
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
    const builder = new QueryBuilder();
    builder.newEdgeQuery();
    builder.filterSource(DATA_SOURCE_GTEX);
    builder.filterBiosample(this.state.biosampleValue);
    builder.filterMaxPValue(this.state.pvalue);
    return builder.build();
  }

  addQueryTrack = () => {
    const query = this.buildQuery();
    this.appModel.trackMixPanel("Add GTEX Track", { "query": query });
    // QYD: The results of this query is "Edges" instead of GenomeNodes, we might need a new method for displaying
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
    if (this.state.loading) {
      return (<div className="navigation-controller-loading">
        <CircularProgress size={80} thickness={5} />
      </div>);
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
        <br/>
        <br/>
        <div>
          {" "}
          {"P-Value < "} {this.state.pvalue}{" "}
        </div>
        <Slider
          min={0}
          max={0.1}
          step={0.0001}
          value={this.state.pvalue}
          onChange={this.handleUpdatePValue}
        />
        <RaisedButton
          label="Add Track"
          primary={true}
          onClick={() => this.addQueryTrack()}
          disabled={!this.state.title}
          style={{width: '95%'}}
        />
      </div>
    );
  }
}

GTEXSelector.propTypes = {
  appModel: PropTypes.object
};

export default GTEXSelector;
