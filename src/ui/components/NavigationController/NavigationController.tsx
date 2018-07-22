// Dependencies
import * as React from "react";
import Drawer from "material-ui/Drawer";
import AppBar from "material-ui/AppBar";
import NavigationClose from "material-ui/svg-icons/navigation/close";
import NavigationArrowBack from "material-ui/svg-icons/navigation/arrow-back";
import IconButton from "material-ui/IconButton";

// Styles
import "./NavigationController.scss";
import ViewModel, { ViewEvent } from "../../models/ViewModel";
import View from "../../View";

type Props = {
  viewModel: ViewModel,
  views: Array<View>
}

type State = { visible: boolean }

class NavigationController extends React.Component<Props, State> {

  constructor(props: Props, ctx?: any) {
    super(props, ctx);
    this.state = {
      visible: false,
    };
    props.viewModel.addListener(this.showView, ViewEvent.SHOW_VIEW);
    props.viewModel.addListener(this.closeView, ViewEvent.CLOSE_VIEW);
  }

  showView = () => {
    this.setState({
      visible: true
    });
  }

  closeView = () => {
    this.setState({
      visible: false,
    });
  }

  render() {
    const navButton =
      this.props.views.length === 1 ? (
        <div />
      ) : (
          <IconButton onClick={() => this.props.viewModel.popView()}>
            <NavigationArrowBack />
          </IconButton>
        );
    const closeButton = (
      <IconButton onClick={() => this.props.viewModel.closeNavigationView()}>
        <NavigationClose />
      </IconButton>
    );

    const curr = this.props.views[this.props.views.length - 1];
    const visible = curr !== undefined;

    const title = visible ? curr.title : "";
    const view = visible ? curr.view : <div />;

    return (
      <Drawer className="navigation-controller" width={400} openSecondary={true} open={visible && this.state.visible}>
        <AppBar
          title={title}
          iconElementLeft={navButton}
          iconElementRight={closeButton}
        />
        {view}
      </Drawer>
    );
  }

}

export default NavigationController;
