import React, { Component } from 'react';
import PropTypes from 'prop-types';

// Styles
import './DataListItem.scss';

function DataListItem(props) {
  return (
    <button className="data-list-item" onClick={props.onClick}>
      <div className="option-title">
        {props.title}
      </div>
      <div className="option-description">
        {props.description}
      </div>
    </button>
  );
}

DataListItem.propTypes = {
  onClick: PropTypes.func,
  title: PropTypes.string,
  description: PropTypes.string,
};

export default DataListItem;
