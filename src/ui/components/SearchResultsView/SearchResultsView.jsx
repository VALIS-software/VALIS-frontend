// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import CircularProgress from "material-ui/CircularProgress";
import SearchFilter from "../Shared/SearchFilter/SearchFilter";
import GenomicLocation from "../Shared/GenomicLocation/GenomicLocation";
import ArrowBack from 'material-ui/svg-icons/navigation/arrow-back';
import Pills from "../Shared/Pills/Pills";
import FlatButton from 'material-ui/FlatButton';
import UserFeedBackButton from '../Shared/UserFeedBackButton/UserFeedBackButton';
import { List, InfiniteLoader, CellMeasurer, CellMeasurerCache } from 'react-virtualized';
import { prettyPrint } from "../TraitDetails/TraitDetails";
import SiriusApi from "sirius/SiriusApi";
import { FilterType } from "../../models/QueryModel";
import { QueryType } from "sirius/QueryBuilder";


// Styles
import "./SearchResultsView.scss";
import 'react-virtualized/styles.css'
import { EntityType } from "sirius/EntityType";
import { App } from '../../../App';

const FETCH_SIZE = 30;

function truncate(str, length) {
  return str.length < length ? str : str.slice(length) + '...';
}

class SearchResultsView extends React.Component {
  constructor(props) {
    super(props);
    this.appModel = props.appModel;
    this.viewModel = props.viewModel;
    this.savedQuery = null;

    this.cursor = 0;
    this.fetchedQuery = null;

    this.state = {
      isLoading: true,
      results: [],
    };
    this._cache = new CellMeasurerCache({
      fixedWidth: true,
      minHeight: 80,
    });
  }

  componentDidMount() {
    this.updateQueryModel(this.props.query);
    const height = document.getElementById('search-results-view').clientHeight;
    this.setState({ height });
  }

  addQueryAsTrack = () => {
    if (this.state.results[0].type === 'gene') {
      App.addIntervalTrack(this.props.text, this.query.getFilteredQuery(), (e) => {
        return {
          startIndex: e.start - 1,
          span: e.length
        }
      }, false);
    } else {
      App.addVariantTrack(this.props.text, this.query.getFilteredQuery());
    }

  }

  fetch = (clearResults = false) => {
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
    this.fetchedQuery = this.query;

    const cursor = this.cursor;
    const queryJson = this.fetchedQuery.getFilteredQuery();
    SiriusApi.getQueryResults(queryJson, true, cursor, cursor + FETCH_SIZE).then(results => {
      this.props.appModel.popLoading();
      const newResults = this.state.results.concat(results.data);
      this.cursor += results.data.length;
      this.setState({
        results: newResults,
        hasMore: !results.reached_end,
        isLoading: false,
      });
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

  updateQueryModel = (query) => {
    this.savedQuery = this.query;
    this.query = query;
    this.setState({
      showFilters: false,
    });

    // update the track:
    // if (this.props.trackGuid) {
    //   this.props.appModel.setTrackFilter(this.props.trackGuid, this.filters);
    // }

    // reload the data if needed
    this.fetch(true);
  }

  runLastQuery = () => {
    this.updateQueryModel(this.savedQuery);
  }

  renderRightInfo = (result) => {
    const ref = result.info.variant_ref;
    const alt = result.info.variant_alt;


    const location = result.contig ? (<GenomicLocation interactive={true} contig={result.contig} start={result.start} end={result.end} />) : (<div/>);

    let mutation = null;
    let typeStyle = { backgroundColor: 'grey'}
    let typeName = result.type;
    let pValue = null;
    if (result.type === EntityType.SNP) {
      const isInsertion = alt.split(",").filter(d => d.length > ref.length).length > 0;
      if(isInsertion) {
        typeName = 'insertion';
        mutation = (<span>+ {truncate(alt, 3)}</span>);
      } else if (!alt || ref.length > alt.length) {
        typeName = 'deletion';
        mutation = (<span>✗ {truncate(ref, 3)}</span>);
      } else {
        typeName = 'SNP';
        mutation = (<span>{alt} <span className="allele-arrow">⟶</span> {ref}</span>);
      }
      if('p-value' in result.info) {
        pValue = (<div>
          <Pills items={['p-value']} style={typeStyle} />
          <span> {result.info['p-value'].toExponential()} </span>
          </div>
        );
      }
    } else {
      typeStyle.float = 'right';
    }
    const genomicType = (<Pills items={[typeName]} style={typeStyle} />);
    return (<span className="right-info"><div>{location}</div><div>{genomicType} {mutation}{pValue}</div></span>);
  }

  rowRenderer = ({ index, key, parent, style }) => {
    if (index === this.state.results.length && this.state.hasMore) {
      return (<div key={key} style={{}}>Loading...</div>);
    } else if (index === this.state.results.length) {
      return (<div key={key} style={{}}> End of results </div>);
    }
    const result = this.state.results[index];
    let title = "";
    let description = "";
    const isGenomeNode = result.type !== "trait";


    const sourcePills = (<Pills items={result.source} />);
    const genePills = (<Pills items={result.info.variant_affected_genes} />);
    const tagPills = (<Pills items={result.info.variant_tags} />);
    const alleles = isGenomeNode ? this.renderRightInfo(result) : null;
    title = (<div><span className="search-title">{isGenomeNode ? result.name : prettyPrint(result.name, 25)}</span>{alleles}</div>);

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
      App.displayEntityDetails(result);
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
      const backButton = this.savedQuery ? (<div>
        <FlatButton onClick={() => this.runLastQuery()} icon={(<ArrowBack />)} label="Back to results"/>
      </div>) : null;
      return (<div id="search-results-view" className="search-results-view">
          <div style={style} className="search-results-list">
              <div className="search-results-empty">
                <h3>No results found.</h3>
                {backButton}
                <div>
                   Think we are missing this data?
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
      const enabledFilters = [FilterType.DATASET];
      if (this.state.results.length > 0) {
        const type = this.state.results[0].type;
        if (type === 'variant' || type === 'SNP') {
          enabledFilters.push(FilterType.VARIANT_TAG);
        }
        if (type !== 'trait') {
          enabledFilters.push(FilterType.CHROMOSOME);
        }
      }
      filterMenu = (<SearchFilter
        query={this.query}
        onFinish={this.updateQueryModel}
        onCancel={this.toggleFilters}
        enabledFilters={enabledFilters}
      />);
    }

    let addTrackButton = null;
    if (this.state.results && this.query && this.query.query && this.query.query.type === QueryType.GENOME) {
      addTrackButton = (<button className="float-left" onClick={this.addQueryAsTrack}>Add as Track</button>);
    }

    return (
      <div id="search-results-view" className="search-results-view">
        <div className="search-filters">
          <div className="clearfix">
            {addTrackButton}
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
              width={400}
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