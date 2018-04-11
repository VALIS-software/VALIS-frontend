// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import DataListItem from '../DataListItem/DataListItem.jsx';
import EntityDetails from '../EntityDetails/EntityDetails.jsx';
import CircularProgress from 'material-ui/CircularProgress';

// Styles
import './SearchResultsView.scss';

class SearchResultsView extends Component {
  constructor(props) {
    super(props);
    this.appModel = props.appModel;
    this.api = this.appModel.api;
    this.state = {
      query: null,
      needsRefresh: true,
      results : [],
    };
  }

  resultSelected(result) {
    const title = '';
    const dataID = result._id;
    const elem = (<EntityDetails appModel={this.appModel} dataID={result._id} />);
    this.appModel.pushView(title, dataID, elem);
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState) prevState = {};
    prevState.needsRefresh = prevState.query !== nextProps.query;
    prevState.query = nextProps.query;
    prevState.appModel = nextProps.appModel;
    return prevState;
  }

  render() {
    if (this.state.needsRefresh) {
      this.api.getQueryResults(this.state.query).then(results => {
        this.setState({
          results: results,
          needsRefresh: false,
        });
      }); 
      return (<div className="navigation-controller-loading"><CircularProgress size={80} thickness={5} /> </div>);
    }
    const searchResultItems = this.state.results.map(result => {
      return (<DataListItem
        title={result.name}
        description={''}
        entityId={result._id}
        appModel={this.props.appModel}
        onClick={() =>  this.resultSelected(result)}
        key={result._id}
      />);
    });
    return (<div className="search-results-view">
      <div className="result-info"> { searchResultItems.length } results for query <i>{ this.props.text } </i></div>
      { searchResultItems }
    </div>);
  }
}

SearchResultsView.propTypes = {
  appModel: PropTypes.object,
  query: PropTypes.object,
  text: PropTypes.string,
};


export default SearchResultsView;
