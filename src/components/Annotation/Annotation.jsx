// Dependencies
import React from 'react';
import PropTypes from 'prop-types';

// Styles
import './Annotation.scss';

class Annotation extends React.Component {

  getStyle() {
    return {
      left: this.props.left + 'px',
      top: this.props.top + 'px',
      width: this.props.width + 'px',
    };
  }

  render() {
    const style = this.getStyle();
    return (
      <div style={style} className="annotation">
        Annotation :)
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
