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
      <UserFeedbackButton label="Request Upgrade"/>,
    ];
    return (<Dialog
          title="Premium Feature"
          actions={actions}
          modal={true}
          contentStyle={{width: 600}}
          open={this.state.open}
        >
          This feature is only available in the full version of VALIS.
        </Dialog>);
    }
}

UpgradeDialog.propTypes = {
    open: PropTypes.bool,
};

export default UpgradeDialog;
