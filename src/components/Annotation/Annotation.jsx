// Dependencies
import React from 'react';
import PropTypes from 'prop-types';

// Styles
import './Annotation.scss';

class Annotation extends React.Component {
  getStyle() {
    const yOffset = this.props.annotation.yOffsetPx;
    const height = this.props.annotation.heightPx;
    return {
      transform: `translate(${this.props.left}px, ${this.props.top + yOffset}px)`,
      width: this.props.width + 'px',
      height: height + 'px',
    };
  }

  render() {
    const style = this.getStyle();
    const title = this.props.annotation.metadata.title;
    return (
      <div className="annotation-wrapper">
        <div style={style} className="annotation">
          {title}
        </div>
      </div>
    );
  }
}
Annotation.propTypes = {
   left: PropTypes.number,
   top: PropTypes.number,
   width: PropTypes.number,
   annotation: PropTypes.object,
};

export default Annotation;
