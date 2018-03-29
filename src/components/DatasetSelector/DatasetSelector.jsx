// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';

// Styles
import './DatasetSelector.scss';

class DatasetSelector extends Component {
  constructor(props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
      this.api = this.appModel.api;
    }
    this.state = {
      dataInfo : [],
    };
  }

  componentDidMount() {
    this.api.getTrackInfo().then(dataInfo => {
      this.setState({
        dataInfo: dataInfo,
      });
    });
  }

  render() {
    if (!this.state.dataInfo) return (<div />);
    const dataInfo = this.state.dataInfo;
    const dataInfoBlocks = [];
    for (const di of dataInfo) {
      dataInfoBlocks.push(
        <DataButton
          title={di.title}
          description={di.description}
          onClick={() => this.appModel.dataSetSelected(di.track_type)}
          key={di.title}
        />
      );
    }
    return (<div className="dataset-selector">{ dataInfoBlocks }</div>);
  }
}

DatasetSelector.propTypes = {
  appModel: PropTypes.object,
  onClick: PropTypes.func,
};

function DataButton(props) {
  return (
    <button className="dataset-button" onClick={props.onClick}>
      <div className="option-title">
        {props.title}
      </div>
      <div className="option-description">
        {props.description}
      </div>
    </button>
  );
}

DataButton.propTypes = {
  onClick: PropTypes.func,
  title: PropTypes.string,
  description: PropTypes.string,
};

export default DatasetSelector;
