import * as React from 'react';
import * as PropTypes from 'prop-types';
import './Collapsible.scss';

class Collapsible extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: props.open,
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState) {
      prevState = {};
    }
    prevState.open = nextProps.open;
    return prevState;
  }

  render() {
    const toggle = () => {
      if (this.props.disabled) {
        return;
      }
      this.setState({
        open: !this.state.open,
      });
    };
    const title = this.props.title;
    const iconStyle = {
      largeIcon: {
        width: 20,
        height: 20,
      },
    };
    let toggleIcon = this.state.open ? '-' : '+';
    toggleIcon = this.props.disabled ? '' : toggleIcon;

    const content = this.state.open ? (<div className="collapsible-content">{this.props.children}</div>) : (<div />);
    return (<div className="collapsible">
      <div onClick={toggle} className="collapsible-header">
        {title}
        <div className="collapsible-toggle">{toggleIcon}</div>
      </div>
      {content}
    </div>);
  }
}

Collapsible.propTypes = {
  open: PropTypes.bool,
  title: PropTypes.string,
  disabled: PropTypes.bool,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]),
};

export default Collapsible;
