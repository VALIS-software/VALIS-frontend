// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import Drawer from "material-ui/Drawer";
import AppBar from "material-ui/AppBar";
import NavigationClose from "material-ui/svg-icons/navigation/close";
import NavigationArrowBack from "material-ui/svg-icons/navigation/arrow-back";
import IconButton from "material-ui/IconButton";

// Styles
import "./NavigationController.scss";

class NavigationController extends React.Component {
  state = {};

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState) {
      prevState = {};
    }

    prevState.views = nextProps.views;
    return prevState;
  }

  render() {
    if (!this.state) {
      return <div />;
    }
    const popView = () => {
      this.props.viewModel.popView();
    };
    const closeView = () => {
      this.props.viewModel.closeView();
    };

    const navButton =
      this.state.views.length === 1 ? (
        <div />
      ) : (
          <IconButton onClick={popView}>
            <NavigationArrowBack />
          </IconButton>
        );
    const closeButton = (
      <IconButton onClick={closeView}>
        <NavigationClose />
      </IconButton>
    );

    const curr = this.state.views[this.state.views.length - 1];
    const visible = curr !== undefined;

    const title = visible ? curr.title : "";
    const view = visible ? curr.view : <div />;

    return (
      <Drawer className="navigation-controller" width={300} openSecondary={true} open={visible} >
        <AppBar
          title={title}
          iconElementLeft={navButton}
          iconElementRight={closeButton}
        />
        {view}
      </Drawer >
    );
  }
}

NavigationController.propTypes = {
  viewModel: PropTypes.object,
  views: PropTypes.array
};

export default NavigationController;
