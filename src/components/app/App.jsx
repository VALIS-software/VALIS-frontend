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

const uuid = require('uuid/v1');
const _ = require('underscore');

class App extends React.Component {
  constructor(props) {
    super(props);
    this.api = new GenomeAPI();
    this.addDataTrack = this.addDataTrack.bind(this);
    this.addDataTrack('genome1.1');
    this.addAnnotationTrack('annotation1.1');
  }

  componentDidMount() {
    this.setState({
      tracks: [],
    });
  }

  getTracks() {
    return this.tracks;
  }

  addDataTrack(trackId) {
    this.api.getTrack(trackId).then(model => {
      const track = {
        guid: uuid(),
        dataTrack: model,
        annotationTrack: null,
      };
      this.setState({
        tracks: this.state.tracks.concat([track]),
      });
    });
  }

  removeDataTrack(trackGuid) {
    const arr = this.state.tracks.slice();
    const index = _.findIndex(arr, (item) => {
      return item.guid === trackGuid;
    });

    if (index >= 0) {
      arr.splice(index, 1); 
      this.setState({
        tracks: arr,
      });      
    }
  }

  addAnnotationTrack(annotationId) {
    this.api.getAnnotation([annotationId]).then(model => {
      const track = {
        guid: uuid(),
        dataTrack: null,
        annotationTrack: model,
      };
      this.setState({
        tracks: this.state.tracks.concat([track]),
      });
    });
  }

  removeAnnotationTrack(trackGuid) {

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
          <Header addTrack={this.addDataTrack} />
          <MultiTrackViewer tracks={this.state.tracks} />
        </div>
      </MuiThemeProvider>);
  }
}

export default App;
