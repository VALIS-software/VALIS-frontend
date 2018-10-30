// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import Dialog from 'material-ui/Dialog';
import FlatButton from 'material-ui/FlatButton';
import UserFeedbackButton from '../UserFeedBackButton/UserFeedBackButton';

class UpgradeDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
    };
  }

  handleOpen = () => {
    this.setState({open: true});
  }

  handleClose = () => {
    this.setState({open: false});
    if (this.props.onClose) this.props.onClose();
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState) {
        prevState = {};
    }
    prevState.open = nextProps.open !== undefined ? nextProps.open : prevState.open;
    return prevState;
  }

  render() {
    const actions = [
      <FlatButton
        label="Cancel"
        primary={true}
        style={{float:'left'}}
        onClick={this.handleClose}
      />,
      <UserFeedbackButton label="Get more info"/>,
    ];
    return (<Dialog
          title="Feature not available"
          actions={actions}
          modal={true}
          contentStyle={{width: 600}}
          open={this.state.open}
        >
          This feature is still under development. Please contact us for more information.
        </Dialog>);
    }
}

UpgradeDialog.propTypes = {
    open: PropTypes.bool,
    onClose: PropTypes.func,
};

export default UpgradeDialog;
