import * as React from 'react';
import { buildQuery } from './EncodeQueryBuilder';
import * as PropTypes from 'prop-types';
import Chip from 'material-ui/Chip';
import AutoComplete from 'material-ui/AutoComplete';
import IconButton from 'material-ui/IconButton';
import ActionSearch from 'material-ui/svg-icons/action/search';
import SvgClose from "material-ui/svg-icons/navigation/close";
import CircularProgress from "material-ui/CircularProgress";
import TutorialIndicator from "../TutorialIndicator/TutorialIndicator";
import ErrorDetails from "../ErrorDetails/ErrorDetails";
import { SiriusApi, QueryBuilder, buildQueryParser } from 'valis';
import { buildEncodeQueryParser } from './EncodeQueryParser';
import { App } from '../../../../App';

import './TokenBox.scss';

const DEBOUNCE_TIME = 200;

class TokenBox extends React.Component {
  constructor(props) {
    super(props);
    this.autoComplete = React.createRef();
    this.tokenDiv = React.createRef();
    this.appModel = props.appModel;

    this.queryParser = buildEncodeQueryParser(this.getSuggestionHandlers());

    this.timeOfLastRequest = null;
    this.lastRequest = null;

    this.state = {
      tokens: [],
      dataSource: [],
      open: false,
      searchString: '',
      query: null,
      inputHidden: false,
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
    this.setState({
      searchString: '',
    });
  }

  handleKeyDown = (evt) => {
    const formValue = evt.target.value;
    if (formValue.length === 0 && evt.key === 'Backspace') {
      this.popToken();
    }
  }

  handleUpdateInput = (value, dataSource, params) => {
    // click selection will be handled in this.handleSelectItem()
    if (params.source === 'click') return;
    // store text input
    this.setState({
      searchString: value
    })
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
          tokens: newTokens,
          dataSource: []
      });
      // update search string
      const newString = this.buildQueryStringFromTokens(newTokens);
      // if query is ready, run search
      const testParse = this.queryParser.getSuggestions(newString);
      const currQuery = buildQuery(testParse.tokens);
      if (currQuery !== null) {
        this.setState({
          query: currQuery,
          dataSource: []
        })
        // choose to display single result details or display search results
        this.displaySearchResults(newTokens, currQuery, true);
      } else {
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
    ['TRAIT', 'GENE', 'CELL_TYPE', 'TUMOR_SITE', 'TARGET', 'PATHWAY', 'CELL_TYPE_EQTL', 'CELL_TYPE_PROMOTER', 'CELL_TYPE_ENHANCER'].forEach(rule => {
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

  buildResultTitleFromTokens(tokens) {
    let prefix = '';
    if (tokens && tokens.length) {
      if (tokens[0].value === 'eqtl') {
        prefix = 'eQTLs→';
      } else if (tokens[0].value === 'gene') {
        prefix = 'genes→';
      } else if (tokens[0].value === 'variants') {
        prefix = 'variants→'
      }
    }
    if (!tokens || tokens.length === 0) return prefi;
    let quotedStrs = tokens.filter(token => token.quoted);
    let value = (quotedStrs.length > 0) ? quotedStrs.map(x => x.value).join(' | ') : null;
    if (!value) value = tokens[tokens.length - 1].value;
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
          if (this.searchText !== searchText) return;
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
    const currQuery = buildQuery(result.tokens);
    this.setState({
      query: currQuery,
      quoteInput: result.isQuoted,
      open: openOnLoad,
    });

    if (!currQuery && openOnLoad) {
      setTimeout(() => {
        this.autoComplete.current.focus();
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
    // put text input as new token
    let newTokens = this.state.tokens;
    const text = this.state.searchString;
    if (text !== '') {
      // check if their is a matching choice
      const sourceValues = this.state.dataSource.map(d => {return d.value.toLowerCase()});
      const idx = sourceValues.indexOf(text);
      if (idx !== -1) {
        const item = this.state.dataSource[idx];
        // if the entered text match one item, treat this as clicking the item
        this.handleSelectItem(item, idx);
        return;
      }
      // create a new token and continue
      const token = {
        value: text,
        quoted: false
      }
      newTokens = newTokens.concat([token]);
      this.clearSearchText();
      this.setState({
        tokens: newTokens
      })
    }
    this.displaySearchResults(newTokens, this.state.query);
  }

  displaySearchResults = (tokens, query, fromSelect = false) => {
    // track queryStr
    const queryStr = this.buildQueryStringFromTokens(tokens);
    this.appModel.trackMixPanel("Run search", { 'queryStr': queryStr });
    // choose displaying single details or search results based on search rule
    const builder = new QueryBuilder();
    if (tokens.length === 3 && tokens[0].value === 'gene' && tokens[1].value === 'named') {
      // if it's a gene named query, run it and directly display results
      builder.newGenomeQuery();
      builder.filterName(tokens[2].value);
      builder.setLimit(1);
      const geneQuery = builder.build();
      SiriusApi.getQueryResults(geneQuery, false).then(results => {
        if (results.data.length > 0) {
          const entity = results.data[0];
          App.displayEntityDetails(entity);
        } else {
          // fall back to display 0 search results
          this.pushSearchResultsView(tokens, geneQuery);
        }
      });
    } else if (tokens.length === 1 && tokens[0].value.slice(0,2).toLowerCase() === 'rs') {
      // if it's a snp query
      builder.newGenomeQuery();
      builder.filterID('Gsnp_' + tokens[0].value.toLowerCase());
      builder.setLimit(1);
      const snpQuery = builder.build();
      SiriusApi.getQueryResults(snpQuery, false).then(results => {
        if (results.data.length > 0) {
          const entity = results.data[0];
          App.displayEntityDetails(entity);
        } else {
          // fall back to display 0 search results
          this.pushSearchResultsView(tokens, snpQuery);
        }
      });
    } else if (tokens.length === 3 && tokens[0].value === 'variants' && tokens[1].value === 'named') {
      // if it's a snp query
      builder.newGenomeQuery();
      builder.filterID('Gsnp_' + tokens[2].value.toLowerCase());
      builder.setLimit(1);
      const snpQuery = builder.build();
      SiriusApi.getQueryResults(snpQuery, false).then(results => {
        if (results.data.length > 0) {
          const entity = results.data[0];
          App.displayEntityDetails(entity);
        } else {
          // fall back to display 0 search results
          this.pushSearchResultsView(tokens, snpQuery);
        }
      });
    } else if (fromSelect && tokens.length === 2 && tokens[0].value === 'trait') {
      // if it's a trait query, and is from clicking a selection
      builder.newInfoQuery();
      builder.filterName(tokens[1].value);
      builder.setLimit(1);
      const traitQuery = builder.build();
      SiriusApi.getQueryResults(traitQuery, false).then(results => {
        if (results.data.length > 0) {
          const entity = results.data[0];
          App.displayEntityDetails(entity);
        } else {
          // fall back to display 0 search results
          this.pushSearchResultsView(tokens, traitQuery);
        }
      });
    } else if (query) {
      this.pushSearchResultsView(tokens, query);
    }
    this.setState({
      inputHidden: true,
    });
  }

  pushSearchResultsView = (tokens, query) => {
    let queryTitle = this.buildResultTitleFromTokens(tokens);
    App.displaySearchResults(query, queryTitle);
  }

  clearSearch = () => {
    this.appModel.trackMixPanel("Clear searchbox");
    this.setState({
      tokens: [],
      searchString: '',
      open: false,
      query: null,
      inputHidden: false,
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
      tokens: newTokens,
      inputHidden: false,
      searchString: clickedToken.value
    })
    // convert the last token into search text
    this.autoComplete.current.setState({ searchText: clickedToken.value });
    this.autoComplete.current.focus();

    // the fakeToken here is a trick to get suggestions for the current editing token
    const fakeToken = {
      value: clickedToken.value.slice(0, -1),
      quoted: clickedToken.quoted
    }
    this.getSuggestions(newTokens.concat([fakeToken]), true);
  }

  handleRemoveToken(idx) {
    const { tokens } = this.state;
    const newTokens = tokens.slice(0,idx);
    // remove tokens after clicked one
    this.setState({
      tokens: newTokens,
      inputHidden: false,
      query: null,
      dataSource: []
    })
    this.clearSearchText();
    this.getSuggestions(newTokens, true);
  }

  renderTokenChips() {
    const {tokens} = this.state;
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
    return <div ref={this.tokenDiv} className="chips">{tokenChips}</div>;
  }

  filter = (searchText, key) => {
    return key.value.toLowerCase().indexOf(searchText.toLowerCase()) !== -1 || searchText === '';
  }

  handleMenuKeyDown = (evt) => {
    if (evt.key === 'Enter' || evt.key === 'Tab' || evt.key === ' ') {
      const text = evt.target.textContent;
      const sourceValues = this.state.dataSource.map(d => {return d.value});
      const idx = sourceValues.indexOf(text);
      const item = this.state.dataSource[idx];
      this.handleSelectItem(item, idx);
    } else if (evt.key === 'Escape') {
      this.autoComplete.current.focus();
    }
  }

  getTokenHint(tokens) {
    if (!tokens || !tokens.length) return 'search the genome';
    const rootOptions = ['variants', 'gene', 'eqtl', 'enhancers', 'promoters', 'trait'];
    const distances = ['1kbp of', '5kbp of', '10kbp of', '100kbp of', '1mbp of'];
    let nestedTokens  = null;
    for (let i = tokens.length - 1; i >= 0; i--) {
      if (tokens[i].value === 'within') {
        nestedTokens = tokens.slice(i);
        break;
      }
      if (distances.indexOf(tokens[i].value) >= 0) {
        nestedTokens = tokens.slice(i);
        break;
      }
      if (rootOptions.indexOf(tokens[i].value) >= 0) {
        nestedTokens =  tokens.slice(i);
        break;
      }
    }
    if (nestedTokens[0].value === 'variants') {
      if (nestedTokens[1]) {
        if (nestedTokens[1].value === 'named') {
          return 'enter rs#';
        } else if (nestedTokens[1].value === 'influencing') {
          return 'enter trait name';
        }
      }
    } else if (nestedTokens[0].value === 'gene') {
      if (nestedTokens[1]) {
        if (nestedTokens[1].value === 'named') {
          return 'enter gene name';
        } else if (nestedTokens[1].value === 'influencing') {
          return 'enter trait name';
        } else if (nestedTokens[1].value === 'in pathway') {
          return 'enter pathway name';
        }
      }
    } else if (nestedTokens[0].value === 'eqtl') {
      if (nestedTokens[1]) {
        if (nestedTokens[1].value === 'named') {
          return 'enter rs#';
        } else if (nestedTokens[1].value === 'in') {
          return 'enter cell type';
        }
      }
    } else if (nestedTokens[0].value === 'trait') {
      return 'enter a trait name';
    } else if (nestedTokens[0].value === 'enhancers' || nestedTokens[0].value === 'promoters') {
      return 'enter a cell type';
    }

    if (tokens.length > 1 && tokens[1].value === 'within') {
      if (tokens.length < 3) {
        return 'choose a distance'
      }
    }
    return '';
  }

  render() {
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
    const tokenChips = this.renderTokenChips();
    const hintText = this.state.inputHidden? '' : this.getTokenHint(this.state.tokens);

    // TODO: the AutoComplete component auto-closes when you click a menu item
    // to preven this I hacked in a very long menuCloseDelay time but we should fix that somehow.

    let textBoxWidth = Math.min(500, window.innerWidth * 0.9 - 400);
    if (this.tokenDiv.current) {
      textBoxWidth = Math.max(textBoxWidth - this.tokenDiv.current.offsetWidth, 150);
    }

    const input = (<div className="textbox">
      <AutoComplete
        id='search-box'
        ref={this.autoComplete}
        onKeyDown={this.handleKeyDown}
        openOnFocus={true}
        open={this.state.open}
        filter={AutoComplete.fuzzyFilter}
        hintText={hintText}
        menuCloseDelay={0}
        dataSource={this.state.dataSource}
        dataSourceConfig={{text: 'value', value: 'value'}}
        onUpdateInput={this.handleUpdateInput}
        onNewRequest={this.handleSelectItem}
        menuProps={{onKeyDown: this.handleMenuKeyDown}}
        style={this.state.inputHidden? {display: 'none'}: {width: textBoxWidth}}
        textFieldStyle={{width: textBoxWidth}}
      />
    </div>);

    const drawClear = this.state.searchString.length > 0 || this.state.tokens.length > 0;
    const searchEnabled = this.state.query !== null;
    const clearButton = drawClear ? (<IconButton tooltip="clear" onClick={this.clearSearch}><SvgClose color='white'/></IconButton>) : (<div />);
    const searchTooltip = searchEnabled ? "Search" : "Enter a valid search";
    const searchButton = (<IconButton onClick={searchEnabled? this.runCurrentSearch: null} tooltip={searchTooltip}><ActionSearch color={searchEnabled?'white':'gray'}/></IconButton>);
    const status = (<div className="buttons">
      {clearButton}
      {this.state.inputHidden ? null : searchButton}
    </div>);

    return (<div className="token-box">{tokenChips}{input}{status}</div>);
  }
}

TokenBox.propTypes = {
  appModel: PropTypes.object,
};

export default TokenBox;