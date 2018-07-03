import { Card, CardActions, CardHeader, CardText } from 'material-ui/Card';
import FlatButton from 'material-ui/FlatButton';
import IconButton from 'material-ui/IconButton';
import Popover from 'material-ui/Popover';
import Snackbar from 'material-ui/Snackbar';
import { blue500, purple500 } from 'material-ui/styles/colors';
import BugReport from 'material-ui/svg-icons/action/bug-report';
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
    if (!userProfile) return <div />
    return (
      <div>
        <IconButton onClick={this.handleClick}>
          <BugReport color={purple500} />
          <Popover
            open={open}
            anchorEl={anchorEl}
            anchorOrigin={{ "horizontal": "right", "vertical": "bottom" }}
            targetOrigin={{ "horizontal": "right", "vertical": "top" }}
            onRequestClose={this.handleRequestClose}
          >
            <Card style={{ width: 800 }}>
              <CardHeader
                title="Submit Feedback"
                subtitle={userProfile.name}
              />
              <CardText style={{ backgroundColor: '#eeeeee' }}>
                <TextField
                  floatingLabelText="Subject"
                  value={subject}
                  onChange={this.handleChangeSubject}
                  fullWidth={true}
                  floatingLabelStyle={{ color: '#222222' }}
                  floatingLabelFocusStyle={{ color: blue500 }}
                />
                <TextField
                  floatingLabelText="Description"
                  multiLine={true}
                  value={description}
                  errorText={description ? '' : 'Please enter description here'}
                  rows={4}
                  onChange={this.handleChangeDescription}
                  floatingLabelStyle={{ color: '#222222' }}
                  floatingLabelFocusStyle={{ color: blue500 }}
                  fullWidth={true}
                />
              </CardText>
              <CardActions>
                <FlatButton label='Cancel' onClick={this.handleRequestClose} />
                <FlatButton label='Submit' onClick={this.handleSubmit} disabled={!description} />
              </CardActions>
            </Card>
          </Popover>
        </IconButton>
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
