// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';

import AutoComplete from 'material-ui/AutoComplete';
import MenuItem from 'material-ui/MenuItem';
import DropDownMenu from 'material-ui/DropDownMenu';
import { Toolbar, ToolbarGroup } from 'material-ui/Toolbar';
import IconButton from 'material-ui/IconButton';
import RaisedButton from 'material-ui/RaisedButton';
import NavigationArrowBack from 'material-ui/svg-icons/navigation/arrow-back';
import NavigationArrowForward from 'material-ui/svg-icons/navigation/arrow-forward';

import { CHROMOSOME_SIZES } from '../../helpers/constants.js';

import './Header.scss';

import GenomeAPI from '../../models/api.js';

class Header extends Component {
  constructor(props) {
    super(props);
    this.onNewRequest = this.onNewRequest.bind(this);
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
      const tracks = result.map(d => { return { name: d, resultType: 'annotation' }; });
      this.setState({
        dataSource: this.state.dataSource.concat(tracks),
      });
    });

    this.api.getTracks().then(result => {
      const dataTracks = result.map(d => { return { name: d, resultType: 'data' }; });
      this.setState({
        dataSource: this.state.dataSource.concat(dataTracks),
      });
    });

    this.api.getGraphs().then(result => {
      const graphTracks = result.map(d => { return { name: d, resultType: 'graph' }; });
      this.setState({
        dataSource: this.state.dataSource.concat(graphTracks),
      });
    });
  }

  onUpdateSearchFilter(event, index, value) {
    this.setState({
      searchFilter: value,
    });
  }

  onNewRequest(chosen, index) {
    if (index > -1) {
      if (chosen.resultType === 'data') {
        this.props.model.addDataTrack(chosen.name);  
      } else if (chosen.resultType === 'annotation') {
        this.props.model.addAnnotationTrack(chosen.name);
      } else if (chosen.resultType === 'graph') {
        // TODO: build an interface to choose annotation tracks
        this.props.model.addGraphOverlay(chosen.name, 'cross-track-test-1', 'cross-track-test-2');
      } else if (chosen.resultType === 'location') {
        const viewState = this.props.viewModel.getViewState();
        const bpp = (chosen.range[1] - chosen.range[0]) / viewState.windowSize[0];
        this.props.viewModel.setViewRegion(chosen.range[0], bpp);
      }
    }
  }

  render() {
    const dataSourceConfig = {
      text: 'name',
      value: 'name',
    };
    return (<div className="header">
      <Toolbar>
        <ToolbarGroup firstChild={true}>
          <IconButton onClick={() => this.props.viewModel.back()}>
            <NavigationArrowBack />
          </IconButton>
          <IconButton onClick={() => this.props.viewModel.forward()}>
            <NavigationArrowForward />
          </IconButton>
          <div className="search-box">
            <AutoComplete
              hintText="Search Genomes or Variants"
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
          <DropDownMenu value={this.state.searchFilter}  onChange={this.onUpdateSearchFilter}>
            <MenuItem value={1} primaryText="Everything" />
            <MenuItem value={2} primaryText="Genomes" />
            <MenuItem value={3} primaryText="Genes" />
            <MenuItem value={4} primaryText="SNPs" />
          </DropDownMenu>
          <RaisedButton label="Browse Data" primary={true} onClick={() => this.props.model.addDatasetBrowser()} />
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
