// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import DataListItem from "../DataListItem/DataListItem.jsx";
import CircularProgress from "material-ui/CircularProgress";
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails.jsx";
import SearchFilter from "../Shared/SearchFilter/SearchFilter.jsx";
import { List, InfiniteLoader } from 'react-virtualized';
import Util from "../../helpers/util.js";

const { Map, Set } = require('immutable');

// Styles
import "./SearchResultsView.scss";
import 'react-virtualized/styles.css'
import { ENTITY_TYPE } from "../../helpers/constants";

const FETCH_SIZE = 30;

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
      filters: null,
      cursor: 0
    };
  }

  componentDidMount() {
    this.loadMore();
    const height = document.getElementById('search-results-view').clientHeight;
    this.setState({ height });
  }

  addQueryAsTrack = () => {
    this.props.appModel.addAnnotationTrack(this.props.text, this.state.query, this.state.filters);
  }

  runQuery = () => {
    if (!this.state.query) return;
    const cursor = this.state.cursor;
    const filteredQuery = Util.applyFilterToQuery(this.state.query, this.state.filters);
    this.api.getQueryResults(filteredQuery, true, cursor, cursor + FETCH_SIZE).then(results => {

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

  toggleFilters = () => {
    this.setState({
      showFilters: !this.state.showFilters,
    });
  }

  updateFilters = (filters) => {
    this.setState({
      filters: new Map(filters),
      showFilters: false,
      cursor: 0,
      results: [],
      needsRefresh: true,
    });

    // update the track:
    if (this.props.trackGuid) {
      this.props.appModel.setTrackFilter(this.props.trackGuid, this.state.filters);
    }
  }

  resultSelected(result) {
    this.viewModel.displayEntityDetails(result);
  }

  renderPills = (pills, style) => {
    if (!pills) return (<div />);
    const pillElems = pills.map(item => {
      return (<span style={style} className="pill">{item}</span>)
    })
    return (<span className="pills-container">
      {pillElems}
    </span>);
  }

  renderRightInfo = (result) => {
    const ref = result.info.variant_ref;
    const alt = result.info.variant_alt;
    const genomicType = this.renderPills([result.type], { backgroundColor: 'grey' });
    const location = this.renderLocation(result.contig, result.start, result.end);
    const mutation = null;
    if (result.type === ENTITY_TYPE.SNP) {
      mutation = (<span>{alt} <span className="allele-arrow">⟶</span> {ref}</span>);
    }
    return (<span className="right-info"><div>{location}</div><div>{genomicType} {mutation} </div></span>);
  }

  renderLocation = (contig, start, end) => {
    if (start === end) {
      return (<span className="location"><span className="contig">{contig}</span><span className="range">{start}</span></span>);
    } else {
      return (<span className="location"><span className="contig">{contig}</span><span className="range">{start}:{end}</span></span>);
    }
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

      const sourcePills = this.renderPills(result.source);
      const genePills = this.renderPills(result.info.variant_affected_genes);
      const tagPills = this.renderPills(result.info.variant_tags);
      const alleles = this.renderRightInfo(result);
      title = (<div><span>{result.name}</span>{alleles}</div>);

      const tags = result.info.variant_tags && result.info.variant_tags.length ? (<tr><td>Tags</td><td>{tagPills}</td></tr>) : null;
      const genes = result.info.variant_affected_genes && result.info.variant_affected_genes.length ? (<tr><td>Genes</td><td>{genePills}</td></tr>) : null;
      description = (<div>
        <table className="result-info">
          <tbody>
            {genes}
            <tr><td>Sources</td><td>{sourcePills}</td></tr>
            {tags}
          </tbody>
        </table>
      </div>)
    }
    const openResult = () => {
      this.props.viewModel.displayEntityDetails(result);
    }
    return (<div className="search-result" onClick={openResult} style={style} key={result.id}>
      <div className="search-result-inner">{title}{description}</div>
    </div>);
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState) {
      prevState = {};
    }
    // if there is a trackViewGuid, load filters and query from the track view!
    let query = null;
    let filter = null;
    if (nextProps.trackGuid) {
      query = nextProps.appModel.getTrackQuery(nextProps.trackGuid);
      filter = nextProps.appModel.getTrackFilter(nextProps.trackGuid);
    } else {
      query = nextProps.query;
    }

    prevState.needsRefresh = prevState.query !== query;
    prevState.results = prevState.needsRefresh ? [] : prevState.results;
    prevState.cursor = prevState.needsRefresh ? 0 : prevState.cursor;
    prevState.query = query;
    prevState.filter = filter;
    prevState.appModel = nextProps.appModel;
    return prevState;
  }

  render() {
    if (this.state.needsRefresh) {
      this.runQuery();
      return (<div id="search-results-view" className="search-results-view" />);
    }
    const loadMoreRows = this.state.isLoading ? () => { return null; } : this.loadMore

    const isRowLoaded = ({ index }) => index < this.state.results.length

    const rowCount = this.state.results.length + 1;

    let filterMenu = null;

    if (this.state.showFilters) {
      filterMenu = (<SearchFilter appModel={this.props.appModel} viewModel={this.props.viewModel} filters={this.state.filters} onFinish={this.updateFilters} onCancel={this.toggleFilters} />);
    }
    return (
      <div id="search-results-view" className="search-results-view">
        <div className="search-filters">
          <div className="clearfix">
            <button className="float-left" onClick={this.addQueryAsTrack}>Add as Track</button>
            <button className="float-right" onClick={this.toggleFilters}>Filter</button>
          </div>
          <div>{filterMenu}</div>
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
              rowHeight={120}
              width={300}
              query={this.state.query}
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
  trackGuid: PropTypes.string,
  appModel: PropTypes.object,
  viewModel: PropTypes.object,
  query: PropTypes.object,
  text: PropTypes.string,
};

export default SearchResultsView;
