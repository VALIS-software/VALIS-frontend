import * as React from 'react';
import * as PropTypes from 'prop-types';
import Paper from 'material-ui/Paper';
import Menu from 'material-ui/Menu';
import MenuItem from 'material-ui/MenuItem';
import Chip from 'material-ui/Chip';
import AutoComplete from 'material-ui/AutoComplete';
import IconButton from 'material-ui/IconButton';
import ActionSearch from 'material-ui/svg-icons/action/search';
import ContentClear from 'material-ui/svg-icons/content/clear';
import SearchResultsView from '../../SearchResultsView/SearchResultsView.jsx';
import ErrorDetails from "../ErrorDetails/ErrorDetails.jsx";

import './TokenBox.scss';

class TokenBox extends React.Component {
  constructor(props) {
    super(props);
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
      return d.toLowerCase();
    });

    const query = value.toLowerCase().trim();

    // search for value in case-insensitive fashion:
    const idx = lowered.indexOf(query);
    if (idx < 0) return null;

    // make sure value matches only one suggestion in the dropdown:
    const singleMatch = dataSource.filter(d => {
      return this.filter(query, d);
    }).length <= 1;

    if (!singleMatch) return null;

    return dataSource[idx];

  }

  handleUpdateInput = (value, dataSource, params) => {
    this.setState({
      searchString: value,
    });
    if (!value) return;
    const match = this.perfectMatch(dataSource, value);
    if (match) {
      // clear the search box:
      this.refs.autoComplete.setState({ searchText: '' });

      // update the current tokens list:
      this.state.tokens.push({
        value: match,
        quoted: this.state.quoteInput
      });
      this.setState({
        tokens: this.state.tokens.slice(0),
      });

      // fetch new suggestions:
      let showSuggestions = true;
      if (this.state.tokens[this.state.tokens.length - 1].quoted && this.state.query) {
        showSuggestions = false;
      }
      this.getSuggestions(this.state.tokens, showSuggestions);
    } else {
      // fetch new suggestions:
      const newTokens = this.state.tokens.slice(0);
      newTokens.push({
        value: value,
        quoted: this.state.quoteInput
      });
      this.getSuggestions(newTokens);
    }
  };


  buildQueryStringFromTokens(tokens) {
    let pieces = tokens.map(token => {
      return token.quoted ? '"' + token.value + '"' : token.value;
    });
    return pieces.join(' ');
  }

  getSuggestions(tokens, openOnLoad = true) {
    const searchText = this.buildQueryStringFromTokens(tokens);
    this.props.appModel.api.parseSearchQuery(searchText).then(result => {
      this.setState({
        dataSource: result.suggestions.slice(0, 5),
        open: openOnLoad,
        quoteInput: result.quoted_suggestion,
        query: result.query
      });

      if (!result.query && openOnLoad) {
        this.refs.autoComplete.refs.searchTextField.input.focus();
      }
    }, (err) => {
      this.props.appModel.error(this, err);
      this.setState({
        error: err,
      });
    });
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState) {
      prevState = {};
    }
    return prevState;
  }

  runSearch = () => {
    mixpanel.track("Run search");
    const queryStr = this.buildQueryStringFromTokens(this.state.tokens) + ' ' + this.state.searchString;
    const query = this.state.query;
    const view = (<SearchResultsView text={queryStr} query={query} viewModel={this.props.viewModel} appModel={this.props.appModel} />);
    this.props.viewModel.pushView('Search Results', query, view);
  }

  clearSearch = () => {
    mixpanel.track("Clear searchbox");
    this.setState({
      tokens: [],
      searchString: '',
      open: false,
      query: null,
    });
    this.refs.autoComplete.setState({ searchText: '' });
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

  onChange = (evt) => {
    const formValue = evt.target.value;
    if (formValue.length === 0 && evt.key === 'Backspace') {
      this.popToken();
    } else if (evt.key === 'Enter' && this.state.query) {
      this.runSearch();
    }
  }

  renderToken(tokenText) {
    return (<li key={tokenText} className="token">
      <Chip
      >{tokenText}</Chip>
    </li>);
  }

  filter = (searchText, key) => {
    return key.toLowerCase().indexOf(searchText.toLowerCase()) !== -1 || searchText === '';
  }

  render() {
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
    const elements = [];
    for (let i = 0; i < this.state.tokens.length; i++) {
      const token = this.state.tokens[i];
      elements.push(this.renderToken(token.value));
    }


    // TODO: the AutoComplete component auto-closes when you click a menu item
    // to preven this I hacked in a very long menuCloseDelay time but we should fix that somehow.
    const input = (<AutoComplete
      id='search-box'
      ref='autoComplete'
      onKeyDown={this.onChange}
      openOnFocus={true}
      open={this.state.open}
      filter={this.filter}
      hintText=""
      menuCloseDelay={Infinity}
      dataSource={this.state.dataSource}
      onUpdateInput={this.handleUpdateInput}
    />);
    const style = {
      position: 'absolute',
      right: '0px',
    };

    const drawClear = this.state.searchString.length > 0 || this.state.tokens.length > 0;
    const searchEnabled = this.state.query !== null;
    const tooltip = searchEnabled ? 'Search' : 'Enter a valid search';
    const clearButton = drawClear ? (<IconButton tooltip="Clear" onClick={this.clearSearch}><ContentClear /></IconButton>) : (<div />);
    const searchButton = (<IconButton onClick={this.runSearch} disabled={!searchEnabled} tooltip={tooltip}><ActionSearch /></IconButton>);
    const status = (<div style={style}>
      {clearButton}
      {searchButton}
    </div>);
    return (<div className="token-box">{elements}<div>{input}</div>{status}</div>);
  }
}

TokenBox.propTypes = {
  appModel: PropTypes.object,
  viewModel: PropTypes.object
};

export default TokenBox;
