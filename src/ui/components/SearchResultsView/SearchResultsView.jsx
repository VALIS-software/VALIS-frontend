// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import CircularProgress from "material-ui/CircularProgress";
import SearchFilter from "../Shared/SearchFilter/SearchFilter";
import GenomicLocation from "../Shared/GenomicLocation/GenomicLocation";
import Pills from "../Shared/Pills/Pills";
import UserFeedBackButton from '../Shared/UserFeedBackButton/UserFeedBackButton';
import { List, InfiniteLoader, CellMeasurer, CellMeasurerCache } from 'react-virtualized';
import { prettyPrint } from "../TraitDetails/TraitDetails";
import BooleanTrackSelector from "../BooleanTrackSelector/BooleanTrackSelector";
import TitleSelector from "../TitleSelector/TitleSelector";
import { SiriusApi, QueryType, QueryBuilder } from 'valis';
import QueryModel, { FilterType } from "../../../model/QueryModel";

// Styles
import "./SearchResultsView.scss";
import 'react-virtualized/styles.css'
import { EntityType } from 'valis';
import { App } from '../../../App';

const FETCH_SIZE = 30;

const ADD_TRACK_TUTORIAL = 'Add the results of this search as a new track in the genome browser';
const INTERSECT_TUTORIAL = 'Limit search results to those within a certain distance of another search (e.g within 5kbp of a promoter)';
const DOWNLOAD_TUTORIAL = 'Download the search results in BED format';
const FILTER_TUTORIAL = 'Filter by dataset, chromosome, or mutation type';

function truncate(str, length) {
  if (!str) return '';
  return str.length <= length ? str : str.slice(0,length-1) + '...';
}

class SearchResultsView extends React.Component {
  constructor(props) {
    super(props);
    this.appModel = props.appModel;
    this.viewModel = props.viewModel;

    this.cursor = 0;
    this.fetchedQueryModel = null;

    this.state = {
      isLoading: true,
      results: [],
      query: props.query,
      showIntersect: false,
      showTitle: false,
    };
    this._cache = new CellMeasurerCache({
      fixedWidth: true,
      minHeight: 80,
    });
  }

  componentDidMount() {
    this.updateQueryModel(this.state.query);
    const height = document.getElementById('search-results-view').clientHeight;
    this.setState({ height });
  }

  addQueryAsTrack = (title) => {
    let trackTitle = title;
    const resultType = this.state.results[0].type;
    if (['SNP', 'variant'].indexOf(resultType) > -1) {
      App.addVariantTrack(trackTitle, this.queryModel.getFilteredQuery());
    } else {
      App.addIntervalTrack(trackTitle, this.queryModel.getFilteredQuery(), false);
    }
    this.setState({
      showTitle: false,
    });
  }

  displayQueryTitle = () => {
    this.setState({
      showTitle: true,
    });
  }

  downloadQuery = () => {
    if (this.state.downloading) return;
    this.setState({
      downloading: true,
    });
    SiriusApi.downloadQuery(this.queryModel.getFilteredQuery()).then(response => {
      var headers = response.headers;
      var blob = new Blob([response.data],{type: headers['content-type']});
      var link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      const formatted = this.props.text.replace(/[^\w\s]/gi, '_');
      link.download = `query_results_${formatted}.bed`;
      link.click();
      this.setState({
        downloading: false,
      });
    });
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
    this.fetchedQueryModel = this.queryModel;

    const cursor = this.cursor;
    const query = this.fetchedQueryModel.getFilteredQuery();
    SiriusApi.getQueryResults(query, true, cursor, cursor + FETCH_SIZE).then(results => {
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
    this.queryModel = new QueryModel(query);
    this.setState({
      showFilters: false,
    });
    // reload the data if needed
    this.fetch(true);
  }

  renderAltPercentage = (alt, freq) => {
    const altString = (100.0 * freq).toFixed(0) + '%';
    return <span key={alt}> <span>{truncate(alt,3)}</span> <span className="small"> {altString} </span></span>;
  }

  pushNewSearchResults = (queryModel) => {
    App.displaySearchResults(queryModel.getFilteredQuery(), this.props.text);
  }

  intersectAndAdd = () => {
    this.setState({
      showIntersect: true,
    });
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
      // determine the allele_frequencies
      const allele_frequencies = result.info.allele_frequencies;
      if (allele_frequencies) {
        let ref_freq = 1.0;
        const altParts = [];
        for (const allele in allele_frequencies) {
          altParts.push(this.renderAltPercentage(allele, allele_frequencies[allele]));
          ref_freq = ref_freq - allele_frequencies[allele];
        };
        const refPart = this.renderAltPercentage(ref, ref_freq);
        // render the mutation with AF
        mutation = (<span>{altParts} <span className="allele-arrow">→</span> {refPart} </span>);
      } else {
        mutation = (<span>{truncate(alt,3)} <span className="allele-arrow">→</span> {truncate(ref,3)}</span>);
      }
      if('p-value' in result.info) {
        pValue = (<div className="right-row">
          <Pills items={['p-value']} style={typeStyle} />
          <span> {result.info['p-value'].toExponential()} </span>
          </div>
        );
      }
    } else {
      typeStyle.float = 'right';
    }
    const genomicType = (<Pills items={[typeName]} style={typeStyle} />);
    return (<span className="right-info">{pValue}
      <div className="right-row">{genomicType} {mutation}</div>
      <div className="right-row">{location}</div>
    </span>);
  }

  rowRenderer = ({ index, key, parent, style }) => {
    if (index === this.state.results.length) {
      if (this.state.hasMore) {
        return (<CellMeasurer cache={this._cache} columnIndex={0} key={key} rowIndex={index} parent={parent}>
          <div className="search-results-list" style={style}>
            <div className="search-result-inner">Loading...</div>
          </div>
        </CellMeasurer >);
      } else {
        return (<CellMeasurer cache={this._cache} columnIndex={0} key={key} rowIndex={index} parent={parent}>
          <div className="search-results-list" style={style}>
            <div className="search-result-inner">End of results</div>
          </div>
        </CellMeasurer >);
      }
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
      const query = this.fetchedQueryModel.getFilteredQuery();
      if (query.userFileID) {
        result.userFileID = query.userFileID;
      }
      App.displayEntityDetails(result);
    }
    return (<CellMeasurer
      cache={this._cache}
      columnIndex={0}
      key={key}
      rowIndex={index}
      parent={parent}>
      <div className="search-results-list" onClick={openResult} style={
        {
          ...style,
          height: (isGenomeNode ? 'auto' : 80)
        }} key={result.id}>
        <div className="search-result-inner">{title}{description}</div>
      </div>
    </CellMeasurer >);
  }

  updateQueryIntersection = (queryB, op, windowSize) => {
    const builder = new QueryBuilder(this.state.query);
    if (op === 'intersect') {
      builder.addArithmeticIntersect(queryB);
    } else if (op === 'window') {
      builder.addArithmeticWindow(queryB, windowSize);
    } else if (op === 'union') {
      builder.addArithmeticUnion(queryB);
    } else if (op === 'difference') {
      builder.addArithmeticDiff(queryB);
    }
    const query = builder.build();
    this.setState({
      showIntersect: false,
      query: query,
      results: [],
    });
    this.updateQueryModel(query);
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
      return (<div id="search-results-view" className="search-results-view">
          <div style={style} className="search-results-list">
              <div className="search-results-empty">
                <h3>No results found.</h3>
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
          enabledFilters.push(FilterType.CONTIG);
        }
      }
      filterMenu = (<SearchFilter
        queryModel={this.queryModel}
        onFinish={this.pushNewSearchResults}
        onCancel={this.toggleFilters}
        enabledFilters={enabledFilters}
      />);
    }

    let addTrackButton = null;
    let exportTrackButton = null;
    let refineButton = null;
    if (this.state.results && this.queryModel && this.queryModel.query && this.queryModel.query.type === QueryType.GENOME) {
      addTrackButton = (<button onMouseEnter={()=> App.setHelpMessage(ADD_TRACK_TUTORIAL)} onMouseLeave={() => App.clearHelpMessage()} className="float-left glow" onClick={()=> {this.setState({showTitle: true})}}>Add as Track</button>);
      refineButton = (<button onMouseEnter={()=> App.setHelpMessage(INTERSECT_TUTORIAL)} onMouseLeave={() => App.clearHelpMessage()} className="float-left glow" onClick={this.intersectAndAdd}>Intersect</button>);
      const exportText = this.state.downloading ? 'Downloading...' : 'Export BED';
      exportTrackButton = (<button className="float-left" onMouseEnter={()=> App.setHelpMessage(DOWNLOAD_TUTORIAL)} onMouseLeave={() => App.clearHelpMessage()} onClick={this.downloadQuery}>{exportText}</button>);
    }

    return (
      <div id="search-results-view" className="search-results-view">
        <BooleanTrackSelector onFinish={this.updateQueryIntersection} onCancel={() => this.setState({showIntersect: false})} visible={this.state.showIntersect} appModel={this.appModel} sourceQuery={this.state.query} />
        <TitleSelector onFinish={(title) => { this.addQueryAsTrack(title)} } onCancel={() => this.setState({showTitle: false})} visible={this.state.showTitle} />
        <div className="search-filters">
          <div className="clearfix">
            {addTrackButton}
            {refineButton}
            {exportTrackButton}
            <button className="float-right" onMouseEnter={()=> App.setHelpMessage(FILTER_TUTORIAL)} onMouseLeave={() => App.clearHelpMessage()} onClick={this.toggleFilters}>Filter</button>
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
              width={450}
              queryModel={this.state.queryModel}
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
  queryModel: PropTypes.object,
  text: PropTypes.string,
};

export default SearchResultsView;