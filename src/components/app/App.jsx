// Dependencies
import React from 'react';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';

// Components
import Header from '../Header/Header.jsx';
import MultiTrackViewer from '../MultiTrackViewer/MultiTrackViewer.jsx';
import AppModel from '../../models/appModel.js';

// Styles
import './App.scss';

const _ = require('underscore');

class App extends React.Component {
  constructor(props) {
    super(props);
    this.updateTracks = this.updateTracks.bind(this);
  }

  componentDidMount() {
    this.setState({
      tracks: [],
    });
    this.appModel = new AppModel();
    this.appModel.addDataTrack('sequence');
    this.appModel.addDataTrack('GM12878-DNase');
    this.appModel.addDataTrack('K562-DNase');
    this.appModel.addDataTrack('MCF7-DNase');
    this.appModel.addAnnotationTrack('GRCh38_genes');
    this.appModel.addListener(this.updateTracks);
  }

  updateTracks(evt) {
    this.setState({
      tracks: evt.tracks,
    });
  }

  render() {
    if (!this.state) return (<div />);

    return (
      <MuiThemeProvider>
        <div className="site-wrapper">
          <Header model={this.appModel} />
          <MultiTrackViewer model={this.appModel} />
        </div>
      </MuiThemeProvider>);
  }
}

export default App;
