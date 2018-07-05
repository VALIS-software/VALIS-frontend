// Dependencies
import RaisedButton from 'material-ui/RaisedButton';
import { Toolbar, ToolbarGroup } from 'material-ui/Toolbar';
import * as React from 'react';
import AppModel from '../../models/AppModel';
import ViewModel from '../../models/ViewModel';
import DatasetSelector from '../DatasetSelector/DatasetSelector.jsx';
import TokenBox from '../Shared/TokenBox/TokenBox';

import UserProfileButton from '../Shared/UserProfileButton/UserProfileButton';
import UserFeedBackButton from '../Shared/UserFeedBackButton/UserFeedBackButton';

import './Header.scss';

type Props = {
  viewModel: ViewModel,
  model: AppModel,
  userProfile: any // @! todo type
}

type State = {}

class Header extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  render() {
    return (<div className="header">
      <Toolbar>
        <ToolbarGroup firstChild={true}>
          <div className="search-box">
            <TokenBox appModel={this.props.model} viewModel={this.props.viewModel} />
          </div>
        </ToolbarGroup>
        <ToolbarGroup>
          <UserFeedBackButton userProfile={this.props.userProfile} />
          <div className="user-button">
            <UserProfileButton userProfile={this.props.userProfile} />
          </div>
        </ToolbarGroup>
      </Toolbar>
    </div>);
  }
}

export default Header;