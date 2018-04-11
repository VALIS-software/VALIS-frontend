// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';

import AutoComplete from 'material-ui/AutoComplete';
import MenuItem from 'material-ui/MenuItem';
import DropDownMenu from 'material-ui/DropDownMenu';
import { Toolbar, ToolbarGroup } from 'material-ui/Toolbar';
import IconButton from 'material-ui/IconButton';
import RaisedButton from 'material-ui/RaisedButton';
import DatasetSelector from '../DatasetSelector/DatasetSelector.jsx';
import SearchResultsView from '../SearchResultsView/SearchResultsView.jsx';
import EntityDetails from '../EntityDetails/EntityDetails.jsx';
import NavigationArrowBack from 'material-ui/svg-icons/navigation/arrow-back';
import NavigationArrowForward from 'material-ui/svg-icons/navigation/arrow-forward';
import QueryBuilder, { QUERY_TYPE_INFO } from '../../models/query.js';
import { DATA_SOURCE_GWAS, DATA_SOURCE_CLINVAR  } from '../../helpers/constants.js';

import './Header.scss';

import GenomeAPI from '../../models/api.js';

class Header extends Component {
  constructor(props) {
    super(props);
    this.onNewRequest = this.onNewRequest.bind(this);
    this.handleUpdateInput = this.handleUpdateInput.bind(this);
    this.addDatasetBrowser = this.addDatasetBrowser.bind(this);
    this.api = new GenomeAPI();
    this.state = {
      dataSource : [],
      inputValue : '',
      searchFilter: 1,
    };
  }

  handleUpdateInput(searchText) {
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    const infoQuery = builder.build();
    this.api.getDistinctValues('info.description', infoQuery).then(data => {
      this.setState({
        dataSource: data,
      });
    });
  }

  onNewRequest(chosen, index) {
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.searchText(chosen);
    builder.setLimit(150);
    const query = builder.build();
    const view = (<SearchResultsView text={chosen} query={query} appModel={this.props.model} />);
    this.props.model.pushView('Search Results', query, view);
  }

  addDatasetBrowser() {
    const view = (<DatasetSelector appModel={this.props.model} />);
    this.props.model.pushView('Select Dataset', null, view);
  }

  render() {
    const dataSourceConfig = {
      text: 'name',
      value: 'name',
    };
    const addDatasetBrowser = this.addDatasetBrowser;
    return (<div className="header">
      <Toolbar>
        <ToolbarGroup firstChild={true} style={{ width: '512px' }}>
          <div className="search-box">
            <AutoComplete
              hintText="Enter a gene or trait"
              dataSource={this.state.dataSource}
              onNewRequest={this.onNewRequest}
              dataSourceConfig={dataSourceConfig}
              onUpdateInput={this.handleUpdateInput}
              filter={AutoComplete.caseInsensitiveFilter}
              maxSearchResults={8}
              fullWidth={true}
            />
          </div>
        </ToolbarGroup>
        <ToolbarGroup>
          <RaisedButton label="Browse Data" primary={true} onClick={addDatasetBrowser} />
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
