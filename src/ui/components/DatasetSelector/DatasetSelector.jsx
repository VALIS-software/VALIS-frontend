// Dependencies
import * as React from "react";
import GWASSelector from "../GWASSelector/GWASSelector.jsx";
import GenomeSelector from "../GenomeSelector/GenomeSelector.jsx";
import TrackSelector from "../TrackSelector/TrackSelector.jsx";
import FunctionalTrackSelector from "../FunctionalTrackSelector/FunctionalTrackSelector.jsx";
import ENCODESelector from "../ENCODESelector/ENCODESelector.jsx";
import BooleanTrackSelector from "../BooleanTrackSelector/BooleanTrackSelector.jsx";
import DataListItem from "../DataListItem/DataListItem.jsx";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails.jsx";
import { NavigationView } from "../NavigationController/NavigationController";
// Styles
import "./DatasetSelector.scss";

import {
  TRACK_TYPE_SEQUENCE,
  TRACK_TYPE_FUNCTIONAL,
  TRACK_TYPE_GENOME,
  TRACK_TYPE_GWAS,
  TRACK_TYPE_ENCODE,
  TRACK_TYPE_NETWORK,
  TRACK_TYPE_BOOLEAN
} from "../../helpers/constants";

class DatasetSelector extends NavigationView {
  constructor(props) {
    super(props);

    this.state = {
      dataInfo: []
    };
  }

  componentMountedInNavController(nav) {
    nav.api().getTrackInfo().then(dataInfo => {
      this.setState({
        dataInfo: dataInfo,
      });
    }, err => {
      this.app().error(this, err);
      this.setState({
        error: err,
      });
    });
  }

  dataSetSelected = (trackType) => {
    if (trackType === TRACK_TYPE_GENOME) {
      this.controller().pushView(<GenomeSelector ref={this.controller().bind} />);
    } else if (trackType === TRACK_TYPE_GWAS) {
      this.controller().pushView(<GWASSelector ref={this.controller().bind} />);
    } else if (trackType === TRACK_TYPE_ENCODE) {
      this.controller().pushView(<ENCODESelector ref={this.controller().bind} />);
    } else if (trackType === TRACK_TYPE_FUNCTIONAL) {
      this.controller().pushView(<FunctionalTrackSelector ref={this.controller().bind} />);
    } else if (trackType === TRACK_TYPE_SEQUENCE) {
      this.controller().pushView(<TrackSelector trackType={trackType} ref={this.controller().bind} />);
    } else if (trackType === TRACK_TYPE_NETWORK) {
      this.controller().pushView(<TrackSelector trackType={trackType} ref={this.controller().bind} />);
    } else if (trackType === TRACK_TYPE_BOOLEAN) {
      this.controller().pushView(<BooleanTrackSelector ref={this.controller().bind} />);
    }
  }

  render() {
    if (!this.state.dataInfo) {
      return <div />;
    }
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
    const dataSetSelected = this.dataSetSelected;
    const dataInfo = this.state.dataInfo;
    const dataInfoBlocks = [];
    for (const di of dataInfo) {
      dataInfoBlocks.push(
        <DataListItem
          title={di.title}
          description={di.description}
          onClick={() => this.dataSetSelected(di.track_type)}
          key={di.title}
        />
      );
    }
    return <div className="dataset-selector">{dataInfoBlocks}</div>;
  }
}

export default DatasetSelector;
