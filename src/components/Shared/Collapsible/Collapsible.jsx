import React, { Component } from 'react';
import PropTypes from 'prop-types';
import './Collapsible.scss';

class Collapsible extends Component {
  constructor(props) {
    super(props);
    this.state = {
      open: props.open,
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState) prevState = {};
    prevState.open = nextProps.open;
    return prevState;
  }

  render() {
    const toggle = () => {
      if (this.props.disabled) return;
      this.setState ({
        open: !this.state.open,
      });
    }
    const title = this.props.title;
    const iconStyle = {
      largeIcon: {
        width: 20,
        height: 20,
      },
    };
    const toggleIcon = this.props.disabled ? "" : (this.state.open ? "-" : "+");
    const content = this.state.open ? (<div className="collapsible-content">{this.props.children}</div>) : (<div />);
    return (<div className="collapsible">
      <div onClick={toggle} class="collapsible-header">
        {title}
        <div className="collapsible-toggle">{toggleIcon}</div>
      </div>
      {content}
    </div>);
  }
}


Collapsible.propTypes = {
  open: PropTypes.bool,
  disabled: PropTypes.bool,
};

export default Collapsible;