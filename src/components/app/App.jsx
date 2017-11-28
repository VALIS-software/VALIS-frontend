// Dependencies
import React from 'react';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';

// Components
import Header from '../Header/Header.jsx';
import MultiTrackViewer from '../MultiTrackViewer/MultiTrackViewer.jsx';
import GenomeAPI from '../../models/api.js';

// Styles
import './App.scss';

const _ = require('underscore');

class App extends React.Component {
  constructor(props) {
    super(props);
    this.api = new GenomeAPI();
    this.addTrack = this.addTrack.bind(this);
    this.addTrack('genome1.1');
  }

  componentDidMount() {
    this.setState({
      tracks: [],
    });
  }

  getTracks() {
    return this.tracks;
  }

  addTrack(trackId) {
    this.api.getTrack(trackId).then(model => {
      this.setState({
        tracks: this.state.tracks.concat([model]),
      });
    });
  }

  removeTrack(trackGuid) {
    const arr = this.state.tracks.slice();
    const index = _.findIndex(arr, (item) => {
      return item.guidId === trackGuid;
    });

    if (index >= 0) {
      arr.splice(index, 1); 
      this.setState({
        tracks: arr,
      });      
    }
  }

  addAnnotationToTrack(annotationId, trackGuid) {

  }

  removeAnnotationFromTrack(annotationId, trackGuid) {
    
  }

  render() {
    if (!this.state) return (<div />);

    return (
      <MuiThemeProvider>
        <div className="site-wrapper">
          <Header addTrack={this.addTrack} />
          <MultiTrackViewer tracks={this.state.tracks} />
        </div>
      </MuiThemeProvider>);
  }
}

export default App;
