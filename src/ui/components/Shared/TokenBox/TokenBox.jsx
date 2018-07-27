import * as React from 'react';
import * as PropTypes from 'prop-types';
import Chip from 'material-ui/Chip';
import AutoComplete from 'material-ui/AutoComplete';
import IconButton from 'material-ui/IconButton';
import ActionSearch from 'material-ui/svg-icons/action/search';
import SvgClose from "material-ui/svg-icons/navigation/close";
import CircularProgress from "material-ui/CircularProgress";
import SearchResultsView from '../../SearchResultsView/SearchResultsView';
import ErrorDetails from "../ErrorDetails/ErrorDetails";
import buildQueryParser from "sirius/queryparser";
import SiriusApi from "sirius/SiriusApi";
import QueryModel from "../../../models/QueryModel";

import './TokenBox.scss';

const DEBOUNCE_TIME = 200;

class TokenBox extends React.Component {
  constructor(props) {
    super(props);
    this.autoComplete = React.createRef();
    this.appModel = props.appModel;
    this.viewModel = props.viewModel;

    this.queryParser = buildQueryParser(this.getSuggestionHandlers());

    this.timeOfLastRequest = null;
    this.lastRequest = null;

    this.state = {
      tokens: [],
      dataSource: [],
      open: false,
      searchString: '',
      query: null,
    };
  }

  componentDidMount() {
    this.getSuggestions([], false);
  }

  perfectMatch(dataSource, value) {
    const lowered = dataSource.map(d => {
      return d.value.toLowerCase();
    });

    const query = value.toLowerCase().trim();

    // search for value in case-insensitive fashion:
    const idx = lowered.indexOf(query);
    if (idx < 0) return null;

    // make sure value matches only one suggestion in the dropdown:
    const singleMatch = this.singleResult(dataSource, query);

    if (!singleMatch) return null;
    return dataSource[idx];
  }

  clearSearchText() {
    this.autoComplete.current.setState({ searchText: '' });
  }

  handleUpdateInput = (value, dataSource, params) => {
    // click selection will be handled in this.handleSelectItem()
    if (params.source === 'click') return;
    // try to find a perfect match
    const match = this.perfectMatch(dataSource, value);
    const isGeneOrTrait = match && (match.rule === 'GENE' || match.rule === 'TRAIT');
    const token = {
      value: value,
      quoted: this.state.quoteInput
    };
    const newTokens = this.state.tokens.concat([token]);
    // create token if found match and not quoted
    if (match !== null && !isGeneOrTrait && !this.state.quoteInput) {
      // clear the text in search box
      this.clearSearchText();
      // update the current tokens list
      this.setState({
        tokens: newTokens,
        dataSource: []
      });
      // // try to parse a query
      // const newString = this.buildQueryStringFromTokens(newTokens);
      // const testParse = this.queryParser.getSuggestions(newString);
      // fetch new suggestions if not quoted or no query parsed yet:
      const showSuggestions = (!token.quoted) || (!this.state.query)
      this.getSuggestions(newTokens, showSuggestions);
    } else {
      this.getSuggestions(newTokens, true);
    }
  };

  handleSelectItem = (chosenRequest, index) => {
    // handle enter key event
    if (index === -1) {
      this.runCurrentSearch();
    } else {
      this.clearSearchText();
      // prepare new tokens
      const token = {
        value: chosenRequest.value,
        quoted: this.state.quoteInput
      };
      // build the new tokens
      let newTokens;
      if (this.state.tokens.length === 0) {
        if (chosenRequest.rule === 'GENE') {
          // auto-convert gene name search
          newTokens = [
            {value: 'gene', quoted: false},
            {value: 'named', quoted: false},
            {value: token.value, quoted: true},
          ];
        } else if (chosenRequest.rule === 'TRAIT') {
          // auto-convert trait name search
          newTokens = [
            {value: 'trait', quoted: false},
            {value: token.value, quoted: true},
          ];
        } else {
          newTokens = [token];
        }
      } else {
        newTokens = this.state.tokens.concat([token]);
      }
      this.setState({
          tokens: newTokens
      });
      // update search string
      const newString = this.buildQueryStringFromTokens(newTokens);
      this.setState({
        searchString: newString
      });
      // if query is ready, run search
      const testParse = this.queryParser.getSuggestions(newString);
      if (testParse.query !== null) {
        this.pushSearchResultsView(newTokens, newString, testParse.query);
      } else {
        // if no query available, get next suggestions
        this.getSuggestions(newTokens, true);
      }
    }
  }

  getThrottledResultPromise(rule, searchText, maxResults) {
    const currTime = Date.now();
    this.timeOfLastRequest = currTime;
    this.lastRequest = new Promise((resolve, reject) => {
      setTimeout(() => {
        if (currTime < this.timeOfLastRequest) resolve(this.lastRequest);
        else {
          resolve(SiriusApi.getSuggestions(rule, searchText, maxResults).then(results => {
            return results.map(value => { return { rule: rule, value: value}; });
          }));
        }
      }, DEBOUNCE_TIME);
    });
    return this.lastRequest;
  }

  getSuggestionHandlers() {
    const suggestionMap = new Map();
    ['TRAIT', 'GENE', 'CELL_TYPE', 'TUMOR_SITE'].forEach(rule => {
      suggestionMap.set(rule, (searchText, maxResults) => {
        return this.getThrottledResultPromise(rule, searchText, maxResults).then(d=> {
          return d;
        });
      });
    });
    return suggestionMap;
  }

  buildQueryStringFromTokens(tokens) {
    let pieces = tokens.map(token => {
      return token.quoted ? '"' + token.value + '"' : token.value;
    });
    return pieces.join(' ');
  }

  buildResultTitleFromTokens(tokens, searchString) {
    let prefix = '';
    if (tokens && tokens.length) {
      if (tokens[0].value === 'eqtl') {
        prefix = 'eQTLs→';
      } else if (tokens[0].value === 'gene') {
        prefix = 'genes→';
      } else {
        prefix = 'variants→'
      }
    }
    if (!tokens || tokens.length === 0) return prefix + searchString;
    let quotedStrs = tokens.filter(token => token.quoted);
    let value = (quotedStrs.length > 0) ? quotedStrs[0].value : searchString;
    value = value.length > 18 ? value.slice(0, 15) + '...' : value;
    return prefix + value;
  }

  singleResult = (results, searchText) => {
    return results.filter(result => AutoComplete.fuzzyFilter(searchText, result.value)).length > 0;
  }

  getSuggestions(tokens, openOnLoad = true) {
    const searchText = this.buildQueryStringFromTokens(tokens);
    this.searchText = searchText;
    const result = this.queryParser.getSuggestions(searchText);

    this.appModel.pushLoading();
    result.suggestions.then(results => {
      if (this.searchText !== searchText) return;
      this.appModel.popLoading();

      // if a fuzzy match exists or no additional suggestions, just show the suggestion
      const fuzzyMatchExists = this.singleResult(results, searchText);
      const showCurrentResults = fuzzyMatchExists || !result.additionalSuggestions || searchText.length === 0;
          if (showCurrentResults) {
            this.setState({
              dataSource: results,
            });
          } else if (result.additionalSuggestions){
            // if we have additional suggestions (full text search)
            // fire them iff they are newer than any other promise
            this.appModel.pushLoading();
            result.additionalSuggestions.then(additionalResults => {
              this.appModel.popLoading();
                this.setState({
                  dataSource: additionalResults,
                });
            }, err => {
              this.appModel.popLoading();
            });
        }
      }, err => {
      this.appModel.popLoading();
    });

    this.setState({
      query: result.query,
      quoteInput: result.isQuoted,
      open: openOnLoad,
    });

    if (!result.query && openOnLoad) {
      setTimeout(() => {
        this.autoComplete.current.refs.searchTextField.input.focus();
      }, 100);
    }
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState) {
      prevState = {};
    }
    return prevState;
  }

  runCurrentSearch = () => {
    this.pushSearchResultsView(this.state.tokens, this.state.searchString, this.state.query);
  }

  pushSearchResultsView = (tokens, searchString, query) => {
    let queryStr = this.buildQueryStringFromTokens(tokens);
    let queryTitle = this.buildResultTitleFromTokens(tokens, searchString);
    const query = new QueryModel(query);
    const uid = `search-result-${window.performance.now()}`;
    this.appModel.trackMixPanel("Run search", { 'queryStr': queryStr });
    const view = (<SearchResultsView
      key={uid}
      text={queryTitle}
      query={query}
      viewModel={this.viewModel}
      appModel={this.appModel}
      autoClickSingleResult={true}
    />);
    this.viewModel.pushView('Search Results', query, view);
  }

  clearSearch = () => {
    this.appModel.trackMixPanel("Clear searchbox");
    this.setState({
      tokens: [],
      searchString: '',
      open: false,
      query: null,
    });
    this.autoComplete.current.setState({ searchText: '' });
    this.getSuggestions([]);
  }

  popToken = () => {
    if (this.state.tokens.length >= 1) {
      this.state.tokens.pop();
      this.setState({
        tokens: this.state.tokens.slice(0),
        searchString: '',
      });
      this.getSuggestions(this.state.tokens);
    }
  }

  handleClickToken(idx) {
    const { tokens } = this.state;
    const clickedToken = tokens[idx];
    const newTokens = tokens.slice(0,idx);
    // remove tokens after clicked one
    this.setState({
      tokens: newTokens
    })
    // convert the last token into search text
    this.autoComplete.current.setState({ searchText: clickedToken.value });
    this.autoComplete.current.focus();
    this.getSuggestions(tokens, true);
  }

  handleRemoveToken(idx) {
    const { tokens } = this.state;
    const newTokens = tokens.slice(0,idx);
    // remove tokens after clicked one
    this.setState({
      tokens: newTokens,
      // dataSource: []
    })
    this.clearSearchText();
    this.getSuggestions(newTokens, true);
  }

  renderTokenChips() {
    const {tokens} = this.state;
    if (tokens.length === 0) return [];
    const tokenChips = [];
    for (const i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const clickToken = () => {
        this.handleClickToken(i);
      };
      const clickRemoveToken = () => {
        this.handleRemoveToken(i);
      }
      tokenChips.push(<li key={i} className="token">
        <Chip onClick={clickToken} onRequestDelete={clickRemoveToken}> {token.value} </Chip>
      </li>);
    }
    return tokenChips;
  }

  filter = (searchText, key) => {
    return key.value.toLowerCase().indexOf(searchText.toLowerCase()) !== -1 || searchText === '';
  }

  menuKeyDown = (evt) => {
    if (evt.key === 'Enter' || evt.key === 'Tab' || evt.key === 'Space') {
      const text = evt.target.textContent;
      const sourceValues = this.state.dataSource.map(d => {return d.value});
      const idx = sourceValues.indexOf(text);
      const item = this.state.dataSource[idx];
      this.handleSelectItem(item, idx);
    }
  }

  render() {
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
    const tokenChips = this.renderTokenChips();

    const hintText = this.state.tokens.length === 0 ? 'gene, trait or rs#' : '';

    // TODO: the AutoComplete component auto-closes when you click a menu item
    // to preven this I hacked in a very long menuCloseDelay time but we should fix that somehow.
    const input = (<AutoComplete
      id='search-box'
      ref={this.autoComplete}
      onKeyDown={this.onChange}
      openOnFocus={true}
      open={this.state.open}
      filter={AutoComplete.fuzzyFilter}
      hintText={hintText}
      menuCloseDelay={0}
      dataSource={this.state.dataSource}
      dataSourceConfig={{text: 'value', value: 'value'}}
      onUpdateInput={this.handleUpdateInput}
      onNewRequest={this.handleSelectItem}
      menuProps={{onKeyDown: this.menuKeyDown}}
    />);
    const style = {
      position: 'absolute',
      right: '0px',
    };

    const drawClear = this.state.searchString.length > 0 || this.state.tokens.length > 0;
    const searchEnabled = this.state.query !== null;
    const tooltip = searchEnabled ? 'Search' : 'Enter a valid search';
    const clearButton = drawClear ? (<IconButton tooltip="Clear" onClick={this.clearSearch}><SvgClose /></IconButton>) : (<div />);
    const searchButton = (<IconButton onClick={this.runCurrentSearch} disabled={!searchEnabled} tooltip={tooltip}><ActionSearch /></IconButton>);
    const progress = this.state.loading ? (<CircularProgress size={80} thickness={5} />) : null;
    const status = (<div style={style}>
      {progress}
      {clearButton}
      {searchButton}
    </div>);
    return (<div className="token-box">{tokenChips}<div>{input}</div>{status}</div>);
  }
}

TokenBox.propTypes = {
  appModel: PropTypes.object,
  viewModel: PropTypes.object
};

export default TokenBox;
