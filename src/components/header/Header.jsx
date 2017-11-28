// Dependencies
import React, { Component } from 'react';
import AppBar from 'material-ui/AppBar';
import AutoComplete from 'material-ui/AutoComplete';
import IconMenu from 'material-ui/IconMenu';
import IconButton from 'material-ui/IconButton';
import FontIcon from 'material-ui/FontIcon';
import NavigationExpandMoreIcon from 'material-ui/svg-icons/navigation/expand-more';
import MenuItem from 'material-ui/MenuItem';
import DropDownMenu from 'material-ui/DropDownMenu';
import RaisedButton from 'material-ui/RaisedButton';
import { Toolbar, ToolbarGroup, ToolbarSeparator, ToolbarTitle } from 'material-ui/Toolbar';

// Styles
import './Header.scss';

class Header extends Component {
  constructor(props) {
    super(props);
    this.onUpdateSearchQuery = this.onUpdateSearchQuery.bind(this);
    this.onUpdateSearchFilter = this.onUpdateSearchFilter.bind(this);
    this.state = {
      dataSource : ['apples', 'bannanas', 'cherries', 'durian', 'elderberry', 'fruit', 'grapes'],
      inputValue : '',
      searchFilter: 1,
    };
  }

  onUpdateSearchFilter(event, index, value) {
    this.setState({
      searchFilter: value,
    });
  }

  onUpdateSearchQuery(event, index, value) {

  }

  render() {
    return (<div className="header">
      <Toolbar>
        <ToolbarGroup firstChild={true}>
          <div className="search-box">
            <AutoComplete
              hintText="Search Genomes or Variants"
              dataSource={this.state.dataSource}
              onUpdateInput={this.onUpdateInput}
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

export default Header;
