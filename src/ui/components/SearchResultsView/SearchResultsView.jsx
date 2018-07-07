// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import CircularProgress from "material-ui/CircularProgress";
import SearchFilter from "../Shared/SearchFilter/SearchFilter.jsx";
import GenomicLocation from "../Shared/GenomicLocation/GenomicLocation.jsx";
import Pills from "../Shared/Pills/Pills.jsx";
import UserFeedBackButton from '../Shared/UserFeedBackButton/UserFeedBackButton';
import { List, InfiniteLoader, CellMeasurer, CellMeasurerCache } from 'react-virtualized';
import Util from "../../helpers/util.js";
import { prettyPrint } from "../TraitDetails/TraitDetails";
const { Map, Set } = require('immutable');

// Styles
import "./SearchResultsView.scss";
import 'react-virtualized/styles.css'
import { EntityType } from "../../../../lib/sirius/EntityType";

const FETCH_SIZE = 30;

class SearchResultsView extends React.Component {
  constructor(props) {
    super(props);
    this.appModel = props.appModel;
    this.viewModel = props.viewModel;
    this.api = this.appModel.api;
    
    this.currentQuery = null;
    this.requestedQuery = null;
    this.cursor = 0;
    this.query = props.query;
    this.currentQuery = null;
    this.filters = props.filters || new Map();

    this.state = {
      isLoading: false,
      results: [],
    };
    this._cache = new CellMeasurerCache({
      fixedWidth: true,
      minHeight: 80,
    });
  }

  componentDidMount() {
    const height = document.getElementById('search-results-view').clientHeight;
    this.setState({ height });
  }
  
  componentDidUpdate(prevProps, prevState) {
    this.query = this.props.query;
    if (this.currentQuery !== this.queryToFetch()) {
      this.fetch(true);
    }
  }

  addQueryAsTrack = () => {
    this.props.appModel.addAnnotationTrack(this.props.text, this.state.query, this.state.filters);
  }

  fetch = (clearResults = false) => {
    const currentQuery = this.queryToFetch();

    // clear the results if needed
    if (clearResults) {
      this.cursor = 0;
      this._cache.clearAll();
      this.setState({
        results: [],
      });
    }

    // set loading states
    this.setState({
      isLoading: true,
    });
    this.props.appModel.pushLoading();

    // update the current fetched query
    this.currentQuery = currentQuery;
    
    const cursor = this.cursor;

    this.api.getQueryResults(currentQuery, true, cursor, cursor + FETCH_SIZE).then(results => {
      this.props.appModel.popLoading();
      const singleResult = (results.result_start === 0 && results.result_end === 1 && results.reached_end === true);
      if (singleResult) {
        this.viewModel.popView();
        this.resultSelected(results.data[0]);
      } else {
        let newResults = this.state.results.slice(0);
        newResults = newResults.concat(results.data);
        this.cursor += results.data.length;
        this.setState({
          results: newResults,
          hasMore: !results.reached_end,
          isLoading: false,
        });
      }
    }, (err) => {
      this.props.appModel.error(this, err);
      this.props.appModel.popLoading();
      this.setState({
        error: err,
        isLoading: false,
      });
    });
  }

  toggleFilters = () => {
    this.setState({
      showFilters: !this.state.showFilters,
    });
  }

  queryToFetch = () => {
    return Util.applyFilterToQuery(this.query, this.filters);
  }

  updateFilters = (filters) => {
    this.filters = new Map(filters);

    this.setState({
      showFilters: false,
    });

    // update the track:
    if (this.props.trackGuid) {
      this.props.appModel.setTrackFilter(this.props.trackGuid, this.filters);
    }

    // reload the data if needed
    this.fetch(true);
  }

  resultSelected(result) {
    this.viewModel.displayEntityDetails(result);
  }

  renderRightInfo = (result) => {
    const ref = result.info.variant_ref;
    const alt = result.info.variant_alt;
    const genomicType = (<Pills items={[result.type]} style={{ backgroundColor: 'grey' }} />);
    const location = (<GenomicLocation contig={result.contig} start={result.start} end={result.end} />);
    const mutation = null;
    if (result.type === EntityType.SNP) {
      mutation = (<span>{alt} <span className="allele-arrow">⟶</span> {ref}</span>);
    }
    return (<span className="right-info"><div>{location}</div><div>{genomicType} {mutation} </div></span>);
  }

  rowRenderer = ({ index, key, parent, style }) => {
    if (index === this.state.results.length && this.state.hasMore) {
      return (<div key={key}>Loading...</div>);
    } else if (index === this.state.results.length) {
      return (<div key={key}> End of results </div>);
    }
    const result = this.state.results[index];
    let title = "";
    let description = "";
    const isGenomeNode = result.type !== "trait";


    const sourcePills = (<Pills items={result.source} />);
    const genePills = (<Pills items={result.info.variant_affected_genes} />);
    const tagPills = (<Pills items={result.info.variant_tags} />);
    const alleles = isGenomeNode ? this.renderRightInfo(result) : null;
    title = (<div><span>{isGenomeNode ? result.name : prettyPrint(result.name, 25)}</span>{alleles}</div>);

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
    </div>);

    const openResult = () => {
      this.props.viewModel.displayEntityDetails(result);
    }
    return (<CellMeasurer
      cache={this._cache}
      columnIndex={0}
      key={key}
      rowIndex={index}
      parent={parent}>
      <div className="search-result" onClick={openResult} style={
        {
          ...style,
          height: (isGenomeNode ? 'auto' : 80)
        }} key={result.id}>
        <div className="search-result-inner">{title}{description}</div>
      </div>
    </CellMeasurer >);
  }

  render() {
    if (this.state.isLoading && this.state.results.length === 0) {
      return (<div id="search-results-view" className="search-results-view navigation-controller-loading">
        <CircularProgress size={80} thickness={5} />
      </div>);
    } else if (this.state.results.length === 0) {
      const style = {
        height: (this.state.height) + 'px',
      };
      const feedbackButton = (<button style={{width: '120px'}}>Send us a request</button>);
      return (<div id="search-results-view" className="search-results-view">
          <div style={style} className="search-results-list">
              <div className="search-results-empty">
                <h3>No results found.</h3>
                <div>
                   Think we should have this data?
                   <UserFeedBackButton label="Submit Request"/>
                </div>
              </div>
          </div>
       </div>);
    }

    const loadMoreRows = this.state.isLoading || !this.state.hasMore ? () => { return null; } : () => this.fetch(false);

    const isRowLoaded = ({ index }) => index < this.state.results.length

    const rowCount = this.state.results.length + (this.state.hasMore ? 1 : 0);

    let filterMenu = null;

    if (this.state.showFilters) {
      filterMenu = (<SearchFilter key={this.filters.toString()} appModel={this.props.appModel} viewModel={this.props.viewModel} filters={this.filters} onFinish={this.updateFilters} onCancel={this.toggleFilters} />);
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
          {({ onRowsRendered, registerChild, getRowHeight }) => (
            <List
              className="search-results-list"
              ref={registerChild}
              height={this.state.height - 48}
              rowCount={rowCount}
              rowHeight={this._cache.rowHeight}
              deferredMeasurementCache={this._cache}
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