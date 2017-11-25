// Dependencies
import React from 'react';
import PropTypes from 'prop-types';

// Styles
import './Annotation.scss';

class Annotation extends React.Component {

  getStyle() {
    return {
      transform: `translate(${this.props.left}px, ${this.props.top}px)`,
      width: this.props.width + 'px',
    };
  }

  render() {
    const style = this.getStyle();
    return (
      <div className="annotation-wrapper">
        <div style={style} className="annotation">
          Annotation :)
        </div>
      </div>
    );
  }
}
Annotation.propTypes = {
   left: PropTypes.number,
   top: PropTypes.number,
   width: PropTypes.number,
};

export default Annotation;
