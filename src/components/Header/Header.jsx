// Dependencies
import * as React from 'react';
import * as PropTypes from 'prop-types';


import MenuItem from 'material-ui/MenuItem';
import DropDownMenu from 'material-ui/DropDownMenu';
import { Toolbar, ToolbarGroup } from 'material-ui/Toolbar';
import RaisedButton from 'material-ui/RaisedButton';
import DatasetSelector from '../DatasetSelector/DatasetSelector.jsx';
import SearchResultsView from '../SearchResultsView/SearchResultsView.jsx';
import EntityDetails from '../EntityDetails/EntityDetails';
import TokenBox from '../Shared/TokenBox/TokenBox';
import NavigationArrowBack from 'material-ui/svg-icons/navigation/arrow-back';
import NavigationArrowForward from 'material-ui/svg-icons/navigation/arrow-forward';
import Avatar from 'material-ui/Avatar';
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
      })
    })
  }

  render() {
    const addDatasetBrowser = this.addDatasetBrowser;
    const { userName, userPicture } = this.state;
    return (<div className="header">
      <Toolbar>
        <ToolbarGroup firstChild={true}>
          <div className="search-box">
            <TokenBox appModel={this.props.model} viewModel={this.props.viewModel} />
          </div>
        </ToolbarGroup>
        <ToolbarGroup>
          <RaisedButton label="Browse Data" primary={true} onClick={addDatasetBrowser} />
          <UserProfileButton name={userName} picture={userPicture} />
        </ToolbarGroup>
      </Toolbar>
    </div>);
  }
}

Header.propTypes = {
  model: PropTypes.object,
  viewModel: PropTypes.object,
};


function UserProfileButton(props) {
  if (!props.name || !props.picture) {
    const loginButton = <RaisedButton href='login' label='Sign In' primary={true} />
    return loginButton;
  } else {

    return (
      <Button onClick={}>
        <Avatar src={props.picture} />
      </Button>
    )
  }
}

UserProfileButton.propTypes = {
  name: PropTypes.string,
  picture: PropTypes.string,
}

export default Header;
