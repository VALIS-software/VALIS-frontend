import FlatButton from 'material-ui/FlatButton';
import IconButton from 'material-ui/IconButton';
import Dialog from 'material-ui/Dialog';
import Snackbar from 'material-ui/Snackbar';
import { blue500 } from 'material-ui/styles/colors';
import HelpIcon from 'material-ui/svg-icons/action/help';
import TextField from 'material-ui/TextField';
import * as PropTypes from 'prop-types';
import * as React from 'react';

import axios from 'axios';

const freshdeskUrl = 'https://valis.freshdesk.com';
const freshdeskAuthToken = 'eElBMzNvQzhWM2FjZXFrNGpOdGs6eA=='; // = base64(`${apiToken}:x`)

class UserFeedBackButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
      anchorEl: null,
      subject: '',
      description: '',
      snackOpen: false,
    }
  }

  handleClick = (event) => {
    // This prevents ghost click.
    event.preventDefault();
    this.setState({
      open: true,
      anchorEl: event.currentTarget,
    });
  }

  handleRequestClose = () => {
    this.setState({
      open: false,
    });
  };

  handleChangeSubject = (event) => {
    this.setState({
      subject: event.target.value,
    })
  }

  handleChangeDescription = (event) => {
    this.setState({
      description: event.target.value,
    })
  }

  handleSnakeRequestClose = () => {
    this.setState({
      snackOpen: false,
    });
  }

  handleSubmit = () => {
    const userProfile = this.props.userProfile;
    let email = userProfile.name;
    if (email.indexOf('@') === -1) {
      email = email + '@valis.frontend';
    }
    let subject = this.state.subject;
    if (!subject) subject = 'subject';

    axios.post(
      `${freshdeskUrl}/api/v2/tickets`,
      {
        name: userProfile.name,
        email: email,
        subject: subject,
        description: this.state.description,
        status: 2,
        priority: 1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': freshdeskAuthToken
        }
      }
    );

    this.setState({
      description: '',
      open: false,
      snackOpen: true,
    });
  }

  render() {
    const { subject, description, open, anchorEl, snackOpen } = this.state;
    const userProfile = this.props.userProfile;
    if (!userProfile) userProfile = {
      'name': 'unknown',
    }
    const actions = [
      <FlatButton label='Cancel' onClick={this.handleRequestClose} />,
      <FlatButton label='Submit' onClick={this.handleSubmit} disabled={!description} />
    ];

    const dialog = (<Dialog
      title="Contact Us"
      open={open}
      actions={actions}
      onRequestClose={this.handleRequestClose}
    >
          <div>Send us your feedback, report bugs, or request new features.</div>
          <TextField
            floatingLabelText="Subject"
            value={subject}
            onChange={this.handleChangeSubject}
            fullWidth={true}
            floatingLabelStyle={{ color: '#222222' }}
            floatingLabelFocusStyle={{ color: blue500 }}
          />
          <TextField
            floatingLabelText="Message"
            multiLine={true}
            value={description}
            errorText={description ? '' : 'Please enter your message here'}
            rows={4}
            onChange={this.handleChangeDescription}
            floatingLabelStyle={{ color: '#222222' }}
            floatingLabelFocusStyle={{ color: blue500 }}
            fullWidth={true}
          />
          <small>(You can also email us: <a href="mailto:info@valis.bio">info@valis.bio</a>)</small>
    </Dialog>);

    let button = null;
    if (this.props.label) {
      button = (<FlatButton icon={<HelpIcon/>} onClick={this.handleClick} label={this.props.label} labelPosition="after"></FlatButton>);
    }else {
      button = (<IconButton onClick={this.handleClick} ><HelpIcon color='white'/></IconButton>);
    }
    return (
      <div>
        {button}
        {dialog}
        <Snackbar
          open={snackOpen}
          message="Feedback submitted, thank you!"
          autoHideDuration={4000}
          onRequestClose={this.handleSnakeRequestClose}
        />
      </div>
    );
  }
}

UserFeedBackButton.propTypes = {
  userProfile: PropTypes.object,
};

export default UserFeedBackButton;
