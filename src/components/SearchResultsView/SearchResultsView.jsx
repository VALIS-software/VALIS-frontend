// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import DataListItem from "../DataListItem/DataListItem.jsx";
import CircularProgress from "material-ui/CircularProgress";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails.jsx";
import { List, InfiniteLoader } from 'react-virtualized'


// Styles
import "./SearchResultsView.scss";
import 'react-virtualized/styles.css'

const FETCH_SIZE = 100;

class SearchResultsView extends React.Component {
  constructor(props) {
    super(props);
    this.appModel = props.appModel;
    this.viewModel = props.viewModel;
    this.api = this.appModel.api;
    this.state = {
      query: null,
      needsRefresh: true,
      isLoading: false,
      results: [],
      cursor: 0
    };
  }

  componentDidMount() {
    this.loadMore();
    const height = document.getElementById('search-results-view').clientHeight;
    this.setState({ height });
  }

  runQuery = () => {
    const cursor = this.state.cursor;
    this.api.getQueryResults(this.state.query, true, cursor, cursor + FETCH_SIZE).then(results => {

      if (results.results_total === 1) {
        this.viewModel.popView();
        this.resultSelected(results.data[0]);
      } else {

        let newResults = this.state.results.slice(0);
        newResults = newResults.concat(results.data);
        this.setState({
          results: newResults,
          needsRefresh: false,
          hasMore: !results.reached_end,
          isLoading: false,
          cursor: cursor + results.data.length,
        });
      }
    }, (err) => {
      this.appModel.error(this, err);
      this.setState({
        error: err,
        isLoading: false,
      });
    });
  }

  loadMore = () => {
    this.setState({
      isLoading: true,
    });
    this.runQuery();
  }

  resultSelected(result) {
    this.viewModel.displayEntityDetails(result);
  }

  rowRenderer = ({ index, key, style }) => {
    if (index === this.state.results.length && this.state.hasMore) {
      return (<div key={key}>Loading...</div>);
    } else if (index === this.state.results.length) {
      return (<div key={key}> End of results </div>);
    }
    const result = this.state.results[index];
    let title = "";
    let description = "";
    const sourceStr = result.source.join("/");
    if (result.type === "trait") {
      title = result.name;
      description = "Source: " + sourceStr;
    } else {
      title = result.name;
      description = result.info.description
        ? result.info.description
        : "Source: " + sourceStr;
    }
    return (<div style={style} key={key}>{title}<hr />{description}</div>);
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState) {
      prevState = {};
    }
    prevState.needsRefresh = prevState.query !== nextProps.query;
    prevState.cursor = prevState.needsRefresh ? 0 : prevState.cursor;
    prevState.query = nextProps.query;
    prevState.appModel = nextProps.appModel;
    return prevState;
  }

  render() {
    if (this.state.needsRefresh) {
      this.runQuery();
      return (<div id="search-results-view" className="search-results-view" />);
    }
    const loadMoreRows = this.state.isLoading ? () => { } : this.loadMore

    const isRowLoaded = ({ index }) => index < this.state.results.length

    const rowCount = this.state.results.length + 1;

    return (
      <div id="search-results-view" className="search-results-view">
        <div className="search-filters">

        </div>
        <InfiniteLoader
          isRowLoaded={isRowLoaded}
          loadMoreRows={loadMoreRows}
          rowCount={rowCount}
        >
          {({ onRowsRendered, registerChild }) => (
            <List
              className="search-results-list"
              ref={registerChild}
              height={this.state.height - 48}
              rowCount={rowCount}
              rowHeight={100}
              width={300}
              onRowsRendered={onRowsRendered}
              rowRenderer={this.rowRenderer}
            />
          )}
        </InfiniteLoader>
      </div>
    );
  }
}

SearchResultsView.propTypes = {
  appModel: PropTypes.object,
  viewModel: PropTypes.object,
  query: PropTypes.object,
  text: PropTypes.string
};

export default SearchResultsView;
