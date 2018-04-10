// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Drawer from 'material-ui/Drawer';
import AppBar from 'material-ui/AppBar';
import NavigationClose from 'material-ui/svg-icons/navigation/close';
import NavigationArrowBack from 'material-ui/svg-icons/navigation/arrow-back';
import IconButton from 'material-ui/IconButton';

// Styles
import './NavigationController.scss';


class NavigationController extends Component {

  constructor(props) {
    super(props);
    this.popView = this.popView.bind(this);
  }

  popView() {
    this.props.model.popView();
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState) prevState = {};
    prevState.views = nextProps.views;
    return prevState;
  }

  render() {
    if (!this.state) return (<div />);
    const popView = this.popView;
    const icon = this.state.views.length === 1 ? <NavigationClose /> : <NavigationArrowBack />;
    const navButton = (<IconButton onClick={popView}>{icon}</IconButton>);

    const curr = this.state.views[this.state.views.length - 1];
    const visible = curr !== undefined;

    const title = visible ? curr.title : '';
    const view = visible ? curr.view : (<div />);

    return (<Drawer width={300} openSecondary={true} open={visible}>
      <AppBar
        title={title}
        iconElementLeft={navButton}
      />
      {view}
    </Drawer>);
  }
}

NavigationController.propTypes = {
  model: PropTypes.object,
  views: PropTypes.array,
};

export default NavigationController;
