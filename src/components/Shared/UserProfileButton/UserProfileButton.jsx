import * as React from 'react';
import * as PropTypes from 'prop-types';

import Avatar from 'material-ui/Avatar';
import Popover from 'material-ui/Popover';
import { Card, CardActions, CardHeader, CardMedia, CardTitle, CardText } from 'material-ui/Card';
import FlatButton from 'material-ui/FlatButton';
import RaisedButton from 'material-ui/RaisedButton';

import './UserProfileButton.scss';
import { RaisedButton } from 'material-ui';

class UserProfileButton extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      name: props.name,
      picture: props.picture,
      open: false,
    };
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
    const { name, picture, open, anchorEl } = this.state;
    if (!name || !picture) return (<div />);
    return (
      <button onClick={this.handleClick} className="user-button">
        <Avatar src={picture} />
        <Popover
          open={open}
          anchorEl={anchorEl}
          anchorOrigin={{ "horizontal": "middle", "vertical": "bottom" }}
          targetOrigin={{ "horizontal": "right", "vertical": "top" }}
          onRequestClose={this.handleRequestClose}
        >
          <Card >
            <CardHeader
              subtitle={name}
              avatar={picture}
            />
            <CardActions>
              <FlatButton href='logout' label='Switch User' />
              <FlatButton href='logout' label='Log Out' />
            </CardActions>
          </Card>
        </Popover>
      </button>
    );
  }
}

UserProfileButton.propTypes = {
  user: PropTypes.string,
  picture: PropTypes.string,
};

export default UserProfileButton;