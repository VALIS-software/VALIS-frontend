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
    this.loadMore()
  }

  loadMore = () => {
    this.setState({
      isLoading: true,
    });
    const cursor = this.state.cursor;

    this.api.getQueryResults(this.state.query, true, cursor, cursor + FETCH_SIZE).then(results => {

      if (results.results_total === 1) {
        this.viewModel.popView();
        this.resultSelected(results.data[0]);
      } else {

        let newResults = this.state.results.slice(0);
        newResults = newResults.concat(results.data);
        console.log(results.data);
        console.log('total results', newResults.length);
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

  resultSelected(result) {
    this.viewModel.displayEntityDetails(result);
  }

  rowRenderer = ({ index, key, style }) => {
    if (index === this.state.results.length) {
      return (<div key={key}>Loading...</div>);
    }
    const result = this.state.results[index];
    let title = "";
    let description = "";
    const sourceStr = result.source.join("/");
    if (result.type === "trait") {
      title = result.name;
      description = "Source: " + sourceStr;
    } else {
      title = result.type + " " + result.name;
      description = result.info.description
        ? result.info.description
        : "Source: " + sourceStr;
    }
    // return (
    //   <DataListItem
    //     title={title}
    //     style={style}
    //     description={description}
    //     onClick={() => this.resultSelected(result)}
    //     key={key}
    //   />
    // );
    return (<div style={style} key={key}>{title}</div>);
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState) {
      prevState = {};
    }
    // prevState.needsRefresh = prevState.query !== nextProps.query;
    // prevState.cursor = prevState.needsRefresh ? 0 : prevState.cursor;
    prevState.query = nextProps.query;
    prevState.appModel = nextProps.appModel;
    return prevState;
  }

  render() {
    const loadMoreRows = this.state.isLoading ? () => { } : this.loadMore

    const isRowLoaded = ({ index }) => index < this.state.results.length

    const rowCount = this.state.hasMore ? this.state.results.length + 1 : this.state.results.length;

    return (
      <div className="search-results-view">
        <InfiniteLoader
          isRowLoaded={isRowLoaded}
          loadMoreRows={loadMoreRows}
          rowCount={rowCount}
        >
          {({ onRowsRendered, registerChild }) => (
            <List
              ref={registerChild}
              height={800}
              rowCount={rowCount}
              rowHeight={30}
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
