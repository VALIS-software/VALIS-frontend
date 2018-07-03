// Dependencies
import RaisedButton from 'material-ui/RaisedButton';
import { Toolbar, ToolbarGroup } from 'material-ui/Toolbar';
import * as React from 'react';
import AppModel from '../../models/appModel.js';
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

  addDatasetBrowser = () => {
    mixpanel.track("Click BROWSE DATA");
    const view = (<DatasetSelector viewModel={this.props.viewModel} appModel={this.props.model} />);
    this.props.viewModel.pushView('Select Dataset', null, view);
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
          <RaisedButton label="Browse Data" primary={true} onClick={this.addDatasetBrowser} />
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