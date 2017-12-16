// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';

import AutoComplete from 'material-ui/AutoComplete';
import MenuItem from 'material-ui/MenuItem';
import DropDownMenu from 'material-ui/DropDownMenu';
import { Toolbar, ToolbarGroup } from 'material-ui/Toolbar';

import './Header.scss';

import GenomeAPI from '../../models/api.js';

class Header extends Component {
  constructor(props) {
    super(props);
    this.onUpdateSearchQuery = this.onUpdateSearchQuery.bind(this);
    this.onUpdateSearchFilter = this.onUpdateSearchFilter.bind(this);
    this.api = new GenomeAPI();
    this.state = {
      dataSource : [],
      inputValue : '',
      searchFilter: 1,
    };
  }

  componentDidMount() {
    this.api.getAnnotations().then(result => {
      this.setState({
        dataSource: this.state.dataSource.concat(result),
      });
    });

    this.api.getTracks().then(result => {
      this.setState({
        dataSource: this.state.dataSource.concat(result),
      });
    });
  }

  onUpdateSearchFilter(event, index, value) {
    this.setState({
      searchFilter: value,
    });
  }

  onUpdateSearchQuery(searchText, dataSource, params) {
    if (params.source === 'click') {
      if (searchText[0] === 'a') {
        this.props.model.addAnnotationTrack(searchText);
      } else {
        this.props.model.addDataTrack(searchText);  
      }
    }
  }

  render() {
    return (<div className="header">
      <Toolbar>
        <ToolbarGroup firstChild={true}>
          <div className="search-box">
            <AutoComplete
              hintText="Search Genomes or Variants"
              dataSource={this.state.dataSource}
              onUpdateInput={this.onUpdateSearchQuery}
              fullWidth={true}
            />
          </div>
          <DropDownMenu value={this.state.searchFilter}  onChange={this.onUpdateSearchFilter}>
            <MenuItem value={1} primaryText="Everything" />
            <MenuItem value={2} primaryText="Genomes" />
            <MenuItem value={3} primaryText="Genes" />
            <MenuItem value={4} primaryText="SNPs" />
          </DropDownMenu>
        </ToolbarGroup>
      </Toolbar>
    </div>);
  }
}

Header.propTypes = {
   model: PropTypes.object,
};

export default Header;
