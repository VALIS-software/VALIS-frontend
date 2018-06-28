// Dependencies
import * as React from 'react';
import * as PropTypes from 'prop-types';

import { Toolbar, ToolbarGroup } from 'material-ui/Toolbar';
import RaisedButton from 'material-ui/RaisedButton';

import DatasetSelector from '../DatasetSelector/DatasetSelector.jsx';
import SearchResultsView from '../SearchResultsView/SearchResultsView.jsx';
import TokenBox from '../Shared/TokenBox/TokenBox.jsx';
import UserProfileButton from '../Shared/UserProfileButton/UserProfileButton.jsx';

import QueryBuilder, { QUERY_TYPE_INFO } from '../../models/query.js';
import { DATA_SOURCE_GWAS, DATA_SOURCE_CLINVAR } from '../../helpers/constants.js';

import './Header.scss';

import GenomeAPI from '../../models/api.js';

const dataSourceConfig = {
  text: 'textKey',
  value: 'valueKey',
};

class Header extends React.Component {
  constructor(props) {
    super(props);
    this.api = new GenomeAPI();
    this.state = {
      userName: null,
      userPicture: null,
    };
  }

  addDatasetBrowser = () => {
    mixpanel.track("Click BROWSE DATA");
    const view = (<DatasetSelector viewModel={this.props.viewModel} appModel={this.props.model} />);
    this.props.viewModel.pushView('Select Dataset', null, view);
  }

  componentDidMount() {
    this.api.getUserProfile().then(userProfile => {
      this.setState({
        userName: userProfile.name,
        userPicture: userProfile.picture,
        logged: true,
      })
    })
  }

  render() {
    const { userName, userPicture, logged } = this.state;
    // redirect to login page if not authorized and not in dev mode
    if (logged && !userName && window.location.hostname !== 'localhost')
      window.location.href = '/login';
    return (<div className="header">
      <Toolbar>
        <ToolbarGroup firstChild={true}>
          <div className="search-box">
            <TokenBox appModel={this.props.model} viewModel={this.props.viewModel} />
          </div>
        </ToolbarGroup>
        <ToolbarGroup>
          <RaisedButton label="Browse Data" primary={true} onClick={this.addDatasetBrowser} />
          {userName ? (<UserProfileButton name={userName} picture={userPicture} />) :
            (<RaisedButton href='login' label='Sign In' primary={true} />)}
        </ToolbarGroup>
      </Toolbar>
    </div>);
  }
}

Header.propTypes = {
  model: PropTypes.object,
  viewModel: PropTypes.object,
};

export default Header;
