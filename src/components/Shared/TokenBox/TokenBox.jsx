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

    const tokenMock = ['token1', 'Token2', 'token3'];

    this.state = {
      tokens: tokenMock,
      focus: true,
      dataSource: ['suggestion1', 'suggestion2', 'suggestion3'],
    };
  }

  handleSelection = (value) => {
    this.addToken(value);
  }

  handleUpdateInput = (value) => {
    // send the query for the latest parse:
  };

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState) {
      prevState = {};
    }
    return prevState;
  }

  addToken = (tokenText) => {
    const newTokens = this.state.tokens.slice(0);
    newTokens.push(tokenText);
    this.setState({
      tokens: newTokens,
    });
    this.refs.autoComplete.setState({ searchText : ''});
    // TODO: this is a hack that looks inside the AutoComplete component
    this.refs.autoComplete.refs.searchTextField.input.focus();
  }

  popToken = () => {
    if (this.state.tokens.length >= 1) {
      this.state.tokens.pop();
      this.setState({
        tokens: this.state.tokens.slice(0)
      });
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
      elements.push(this.renderToken(token));
    }

    const input = (<AutoComplete
          ref='autoComplete'
          onKeyDown={this.onChange}
          hintText="Type anything"
          dataSource={this.state.dataSource}
          onNewRequest={this.handleSelection}
          onUpdateInput={this.handleUpdateInput}
        />);
    return (<div className="token-box">{elements}<div>{input}</div></div>);
  }
}

TokenBox.propTypes = {
};

export default TokenBox;
