// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";

// Styles
import "./TrackBackground.scss";

class TrackBackground extends React.Component {
  getStyle() {
    return {
      transform: `translate(0px, ${this.props.top}px)`,
      height: Math.ceil(this.props.height) + "px"
    };
  }
  render() {
    const style = this.getStyle();
    return <div style={style} className="track-background" />;
  }
}

TrackBackground.propTypes = {
  top: PropTypes.number,
  height: PropTypes.number
};

export default TrackBackground;
