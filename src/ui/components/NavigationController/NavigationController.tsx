// Dependencies
import * as React from "react";
import Drawer from "material-ui/Drawer";
import AppBar from "material-ui/AppBar";
import NavigationClose from "material-ui/svg-icons/navigation/close";
import NavigationArrowBack from "material-ui/svg-icons/navigation/arrow-back";
import IconButton from "material-ui/IconButton";

// Styles
import "./NavigationController.scss";
import ViewModel from "../../models/ViewModel";
import AppModel from "../../models/AppModel";
import GenomeAPI from "../../models/api";

import View from "../../View";

type Props = {
  viewModel: ViewModel,
  appModel: AppModel,
  views: Array<View>
}

type State = { }

class NavigationView<Props, State> extends React.Component<{}, State> {
  
  private parentController: NavigationController;

  constructor(props: Props, ctx?: any) {
    super(props, ctx);
    this.parentController = null;
  }

  componentMountedInNavController(nav: NavigationController) {
  }

  public setParentNavController(nav: NavigationController) {
    this.parentController = nav;
  }
  public removeFromParentNavController() {
    this.parentController = null;
  }

  protected controller() : NavigationController {
    return this.parentController;
  }

  public api() : GenomeAPI {
    return this.controller().api();
  }

  public app() : AppModel {
    return this.controller().app();
  }
}

class NavigationController extends React.Component<Props, State> {
  
  public bind : (ref: any) => void;
  
  constructor(props: Props, ctx?: any) {
    super(props, ctx);
    this.state = { };
    this.bind = (ref: any) => {
      if (ref) {
        (ref as NavigationView<Props, State>).setParentNavController(this);
        (ref as NavigationView<Props, State>).componentMountedInNavController(this);
      }
    }
  }

  public api() : GenomeAPI {
    return this.props.appModel.api;
  }

  public app() : AppModel {
    return this.props.appModel;
  }

  public pushView(view: React.ReactNode) {
    // TODO: once we get rid of viewModel in props, store in navController state
    this.props.viewModel.pushView('', '', view);
  }

  public popView() {
    // TODO: once we get rid of viewModel in props, update navController state
    this.props.viewModel.popView();
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
      <IconButton onClick={() => this.props.viewModel.closeView()}>
        <NavigationClose />
      </IconButton>
    );

    const curr = this.props.views[this.props.views.length - 1];
    const visible = curr !== undefined;

    const title = visible ? curr.title : "";
    const view = visible ? curr.view : <div />;

    return (
      <Drawer className="navigation-controller" width={300} openSecondary={true} open={visible}>
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
export { NavigationView }