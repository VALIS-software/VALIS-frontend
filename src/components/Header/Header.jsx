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

class Header extends React.Component {
  constructor(props) {
    super(props);
  }

  addDatasetBrowser = () => {
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
          <div className="user-button">
            <UserProfileButton userProfile={this.props.userProfile} />
          </div>
        </ToolbarGroup>
      </Toolbar>
    </div>);
  }
}

Header.propTypes = {
  model: PropTypes.object,
  viewModel: PropTypes.object,
  userProfile: PropTypes.object,
};

export default Header;
