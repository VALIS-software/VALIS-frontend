import * as React from 'react';
import * as PropTypes from 'prop-types';

// Styles
import './DataListItem.scss';

class DataListItem extends React.Component {

  render() {
    const { title, description, onClick } = this.props;
    return (
      <div className="data-list-item" onClick={onClick}>
        <div className="option-title">
          {title}
        </div>
        <div className="option-description">
          {description}
        </div>
      </div>
    );
  }
}

DataListItem.propTypes = {
  onClick: PropTypes.func,
  title: PropTypes.string,
  description: PropTypes.string,
};

export default DataListItem;
