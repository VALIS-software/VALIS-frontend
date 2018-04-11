import React, { Component } from 'react';
import PropTypes from 'prop-types';

// Styles
import './DataListItem.scss';

class DataListItem extends Component {
  constructor(props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
      this.api = this.appModel.api;
      if (props.entityId) {
        this.api.getDetails(props.entityId).then(detailsData => {
          this.setState({
            data: detailsData,
          });
        });
      }
    }
  }
  render() {
    let title = this.props.title;
    let description = this.props.description;

    if (this.state && this.state.data) {
      title = this.state.data.details.info.description;
      const source = this.state.data.details.source;
      const snps = this.state.data.relations.length;
      description = `source: ${source} (${snps} associations)`;
    }

    return (
      <button className="data-list-item" onClick={this.props.onClick}>
        <div className="option-title">
          {title}
        </div>
        <div className="option-description">
          {description}
        </div>
      </button>
    );
  }
}

DataListItem.propTypes = {
  onClick: PropTypes.func,
  title: PropTypes.string,
  description: PropTypes.string,
  appModel: PropTypes.object,
  entityId: PropTypes.string,
};

export default DataListItem;
