import * as React from 'react';
import * as PropTypes from 'prop-types';

import Avatar from 'material-ui/Avatar';
import Popover from 'material-ui/Popover';
import { Card, CardActions, CardHeader, CardMedia, CardTitle, CardText } from 'material-ui/Card';
import FlatButton from 'material-ui/FlatButton';
import IconButton from 'material-ui/IconButton';
import Menu from 'material-ui/Menu';
import Person from 'material-ui/svg-icons/social/person';

import './UserProfileButton.scss';

class UserProfileButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
      anchorEl: null,
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

  render() {
    const { open, anchorEl } = this.state;
    const userProfile = this.props.userProfile;
    if (!userProfile)
      return (<IconButton href="login" tooltip="Log In">
        <Person />
      </IconButton>
      );
    return (
      <button onClick={this.handleClick} className="user-button">
        <Avatar src={userProfile.picture} />
        <Popover
          open={open}
          anchorEl={anchorEl}
          anchorOrigin={{ "horizontal": "right", "vertical": "bottom" }}
          targetOrigin={{ "horizontal": "right", "vertical": "top" }}
          onRequestClose={this.handleRequestClose}
        >
          {/* We use Menu instead of Card here just for temp fix the "flicker" bug in this version of mui */}
          <Menu>
            <CardHeader
              subtitle={userProfile.name}
              avatar={userProfile.picture}
            />
            <CardActions>
              <FlatButton href='logout' label='Switch User' />
              <FlatButton href='logout' label='Log Out' />
            </CardActions>
          </Menu>
        </Popover>
      </button>
    );
  }
}

UserProfileButton.propTypes = {
  userProfile: PropTypes.object,
};

export default UserProfileButton;