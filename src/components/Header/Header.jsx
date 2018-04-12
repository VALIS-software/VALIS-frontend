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

const dataSourceConfig = {
  text: 'textKey',
  value: 'valueKey',
};

class Header extends Component {
  constructor(props) {
    super(props);
    this.onNewRequest = this.onNewRequest.bind(this);
    this.addDatasetBrowser = this.addDatasetBrowser.bind(this);
    this.api = new GenomeAPI();
    this.state = {
      dataSource : [],
      inputValue : '',
      searchFilter: 1,
    };
  }

  componentDidMount() {
    // fill the autocomplete with all available trait descriptions
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterType('trait');
    const infoQuery = builder.build();
    this.api.getDistinctValues('info.description', infoQuery).then(data => {
      const traitsSource = [];
      data.forEach(t => {
        traitsSource.push({ textKey: t, valueKey: 0 });
      });
      const dataSource = this.state.dataSource.concat(traitsSource);
      this.setState({
        dataSource: dataSource,
      });
    });
    // fill the autocomplete with all gene names
    builder.newGenomeQuery();
    builder.filterType('gene');
    const geneQuery = builder.build();
    this.api.getQueryResults(geneQuery).then(data => {
      const geneSource = [];
      data.forEach(d => {
        geneSource.push({ textKey: d.name, valueKey: 1 });
      });
      const dataSource = this.state.dataSource.concat(geneSource);
      this.setState({
        dataSource: dataSource,
      });
    });
  }

  onNewRequest(chosen, index) {
    // treat as trait if the text is not from autocomplete
    let text = chosen;
    let value = 0;
    if (index >= 0) {
      text = chosen.textKey;
      value = chosen.valueKey;
    }
    const builder = new QueryBuilder();
    if (value === 0) {
      builder.newInfoQuery();
      builder.filterType('trait');
      builder.searchText(text);
      builder.setLimit(150);
    } else if (value === 1) {
      builder.newGenomeQuery();
      builder.filterType('gene');
      builder.filterName(text);
      builder.setLimit(150);
    }
    const query = builder.build();
    const view = (<SearchResultsView text={text} query={query} appModel={this.props.model} />);
    this.props.model.pushView('Search Results', query, view);
  }

  addDatasetBrowser() {
    const view = (<DatasetSelector appModel={this.props.model} />);
    this.props.model.pushView('Select Dataset', null, view);
  }

  render() {
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
