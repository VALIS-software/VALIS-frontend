// Dependencies
import React from 'react';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import LinearProgress from 'material-ui/LinearProgress';

// Components
import Header from '../Header/Header.jsx';
import MultiTrackViewer from '../MultiTrackViewer/MultiTrackViewer.jsx';
import AppModel, { APP_EVENT_LOADING_STATE_CHANGED } from '../../models/appModel.js';

// Styles
import './App.scss';

const _ = require('underscore');

class App extends React.Component {
  constructor(props) {
    super(props);
    this.updateLoadingState = this.updateLoadingState.bind(this);
  }

  componentDidMount() {
    this.setState({
      tracks: [],
      loading: false,
    });
    this.appModel = new AppModel();
    this.appModel.addDataTrack('sequence');
    this.appModel.addDataTrack('GM12878-DNase');
    this.appModel.addDataTrack('K562-DNase');
    this.appModel.addDataTrack('MCF7-DNase');
    this.appModel.addAnnotationTrack('GRCh38_genes');
    this.appModel.addListener(this.updateLoadingState, APP_EVENT_LOADING_STATE_CHANGED);
  }

  updateLoadingState(event) {
    this.setState({
      loading: event.data,
    });
  }

  render() {
    if (!this.state) return (<div />);
    const color = this.state.loading ? '' : 'transparent';
    const progress =  (<LinearProgress color={color} />);
    return (
      <MuiThemeProvider>
        <div className="site-wrapper">
          <Header model={this.appModel} />
          {progress}
          <MultiTrackViewer model={this.appModel} />
        </div>
      </MuiThemeProvider>);
  }
}

export default App;
