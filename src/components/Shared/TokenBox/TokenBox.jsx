import * as React from 'react';
import * as PropTypes from 'prop-types';
import Paper from 'material-ui/Paper';
import Menu from 'material-ui/Menu';
import MenuItem from 'material-ui/MenuItem';
import Chip from 'material-ui/Chip';
import AutoComplete from 'material-ui/AutoComplete';

import './TokenBox.scss';

class TokenBox extends React.Component {
  constructor(props) {
    super(props);
    this.didRedraw = false;
    this.state = {
      tokens: [],
      dataSource: [],
      open: false,
    };
  }

  componentDidMount() {
    this.getSuggestions([], false);
  }

  handleUpdateInput = (value, dataSource, params) => {
    if (!value) return;
    // if the value is one of the suggestions, then just call handleSelection
    if (dataSource.indexOf(value) >= 0) {
      this.refs.autoComplete.setState({searchText:''});
      this.refs.autoComplete.refs.searchTextField.input.focus();
      this.state.tokens.push({
        value: value,
        quoted: this.state.quoteInput
      });
      this.setState({
        tokens: this.state.tokens.slice(0),
      });
      this.getSuggestions(this.state.tokens); 
    } else {
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


  getSuggestions(tokens, openOnLoad=true) {
    const searchText = this.buildQueryStringFromTokens(tokens);
    this.props.appModel.api.parseSearchQuery(searchText).then(result => {
      this.setState({
        dataSource: result.suggestions.slice(0, 5),
        open: openOnLoad,
        quoteInput: result.quoted_suggestion,
      });

      if (result.query) {
        // Show go button
      }
    });
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState) {
      prevState = {};
    }
    return prevState;
  }

  popToken = () => {
    if (this.state.tokens.length >= 1) {
      this.state.tokens.pop();
      this.setState({
        tokens: this.state.tokens.slice(0)
      });
      this.getSuggestions(this.state.tokens);
    }
  }

  onChange = (evt) => {
    const formValue = evt.target.value;
    if (formValue.length === 0 && evt.key === 'Backspace') {
      this.popToken();
    }    
  }

  renderToken(tokenText) {
    return (<li key={tokenText} className="token">
      <Chip
      >{tokenText}</Chip>
    </li>);
  }

  render() {
    const elements = [];
    for (let i = 0; i < this.state.tokens.length; i++) {
      const token = this.state.tokens[i];
      elements.push(this.renderToken(token.value));
    }

    const filter = (searchText, key) => {
      return key.toLowerCase().indexOf(searchText.toLowerCase()) !== -1 || searchText === '';
    }
    // TODO: the AutoComplete component auto-closes when you click a menu item 
    // to preven this I hacked in a very long menuCloseDelay time but we should fix that somehow.
    const input = (<AutoComplete
          ref='autoComplete'
          onKeyDown={this.onChange}
          openOnFocus={true}
          open={this.state.open}
          filter={filter}
          hintText=""
          menuCloseDelay={99999999999}
          dataSource={this.state.dataSource}
          onUpdateInput={this.handleUpdateInput}
        />);
    return (<div className="token-box">{elements}<div>{input}</div></div>);
  }
}

TokenBox.propTypes = {
};

export default TokenBox;
