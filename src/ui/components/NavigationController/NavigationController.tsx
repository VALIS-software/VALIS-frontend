// Dependencies
import * as React from "react";
import Drawer from "material-ui/Drawer";
import AppBar from "material-ui/AppBar";
import NavigationClose from "material-ui/svg-icons/navigation/close";
import NavigationArrowBack from "material-ui/svg-icons/navigation/arrow-back";
import IconButton from "material-ui/IconButton";

// Styles
import "./NavigationController.scss";
import ViewModel from "../../../model/ViewModel";
import View from "../../View";

type Props = {
  viewModel: ViewModel,
  views: Array<View>,
  visible: boolean,
  style?: React.CSSProperties,
}

type State = {  }

class NavigationController extends React.Component<Props, State> {

  constructor(props: Props, ctx?: any) {
    super(props, ctx);
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
      <Drawer
        className="navigation-controller"
        width={450}
        openSecondary={true}
        open={visible && this.props.visible}
        containerStyle={this.props.style}
      >
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
