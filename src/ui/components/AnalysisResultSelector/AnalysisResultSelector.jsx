// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import DataListItem from "../DataListItem/DataListItem";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";
import { Canis } from 'valis';
// Styles
import "./AnalysisResultSelector.scss";


class AnalysisResultSelector extends React.Component {
  constructor(props) {
    super(props);
    this.appModel = props.appModel;
    this.viewModel = this.appModel.viewModel;
    this.api = this.appModel.api;

    this.state = {
      dataInfo: [],
      showUpgrade: false,
    };
  }

  componentDidMount() {
    // TODO: fetch data from CANIS
  }



  render() {
    if (!this.state.dataInfo) {
      return <div />;
    }
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
    const dataInfoBlocks = [];
    const dataInfo = [{title:'TODO', description: 'Fetch user job from CANIS api'}];
    for (const di of dataInfo) {
      const fn = (di.track_type === 'premium') ? this.handleOpen : () => console.log(di.track_type);
      dataInfoBlocks.push(
        <DataListItem
          title={di.title}
          description={di.description}
          onClick={fn}
          key={di.title}
        />
      );
    }

    return (<div className="dataset-selector">{dataInfoBlocks}</div>);
  }
}

AnalysisResultSelector.propTypes = {
  appModel: PropTypes.object,
};

export default AnalysisResultSelector;
