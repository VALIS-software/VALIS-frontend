// Dependencies
import FlatButton from 'material-ui/FlatButton';
import { Toolbar, ToolbarGroup } from 'material-ui/Toolbar';
import * as React from 'react';
import AppModel from '../../models/AppModel';
import ViewModel from '../../models/ViewModel';
import TokenBox from '../Shared/TokenBox/TokenBox';
import ShowChart from 'material-ui/svg-icons/editor/show-chart';
import Menu from 'material-ui/svg-icons/navigation/menu';
import UserProfileButton from '../Shared/UserProfileButton/UserProfileButton';
import UserFeedBackButton from '../Shared/UserFeedBackButton/UserFeedBackButton';
import AnalysisSelector from '../AnalysisSelector/AnalysisSelector';
import IconButton from 'material-ui/IconButton';

import './Header.scss';

type Props = {
  viewModel: ViewModel,
  appModel: AppModel,
  userProfile: any // @! todo type
}

type State = {}

class Header extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);
    this.state = {};
  }

  openAnalysis = () => {
    this.props.viewModel.pushView('Analysis', '', (<AnalysisSelector appModel={this.props.appModel} />));
  }

  render() {
  const analyzeButton = (<FlatButton onClick={this.openAnalysis} label="Analysis" icon={(<ShowChart/>)}></FlatButton>);
    return (<div className="header">
      <Toolbar>
        <ToolbarGroup firstChild={true}>
          <div className="search-box">
            <TokenBox appModel={this.props.appModel} viewModel={this.props.viewModel} />
          </div>
        </ToolbarGroup>
        <ToolbarGroup>
          {analyzeButton}
          <UserFeedBackButton userProfile={this.props.userProfile} />
          <div className="user-button">
            <UserProfileButton userProfile={this.props.userProfile} />
          </div>
          <IconButton onClick={() => this.props.viewModel.showNavigationView()}><Menu /></IconButton>
        </ToolbarGroup>
      </Toolbar>
    </div>);
  }
}

export default Header;