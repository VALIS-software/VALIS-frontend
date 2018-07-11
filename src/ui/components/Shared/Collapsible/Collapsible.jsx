import * as React from 'react';
import * as PropTypes from 'prop-types';
import SvgChevronRight from 'material-ui/svg-icons/navigation/chevron-right';
import SvgExpandMore from 'material-ui/svg-icons/navigation/expand-more';
import SvgExpandLess from 'material-ui/svg-icons/navigation/expand-less';
import './Collapsible.scss';

class Collapsible extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: props.open,
    };
  }

  toggle = () => {
    if (this.props.disabled) return;
    this.setState({
      open: !this.state.open,
    });
  };

  render() {

    const title = this.props.title;
    const iconStyle = {
      largeIcon: {
        width: 20,
        height: 20,
      },
    };
    let toggleIcon = this.state.open ? (<SvgExpandLess />) : (<SvgExpandMore />);
    toggleIcon = this.props.disabled ? '' : toggleIcon;
    toggleIcon = this.props.isLink ?  (<SvgChevronRight />) : toggleIcon;

    const content = this.state.open ? (<div className="collapsible-content">{this.props.children}</div>) : (<div />);
    return (<div className="collapsible">
      <div onClick={this.props.onClick || this.toggle} className="collapsible-header">
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
  isLink: PropTypes.bool,
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]),
};

export default Collapsible;
