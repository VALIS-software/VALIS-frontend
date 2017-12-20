// Dependencies
import React from 'react';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import LinearProgress from 'material-ui/LinearProgress';
import Drawer from 'material-ui/Drawer';
import AppBar from 'material-ui/AppBar';
import NavigationClose from 'material-ui/svg-icons/navigation/close';
import IconButton from 'material-ui/IconButton';

// Components
import Header from '../Header/Header.jsx';
import MultiTrackViewer from '../MultiTrackViewer/MultiTrackViewer.jsx';
import AppModel, { APP_EVENT_LOADING_STATE_CHANGED, APP_EVENT_FOCUS_CHANGED } from '../../models/appModel.js';

// Styles
import './App.scss';

const _ = require('underscore');

class App extends React.Component {
  constructor(props) {
    super(props);
    this.updateLoadingState = this.updateLoadingState.bind(this);
    this.updateFocus = this.updateFocus.bind(this);
    this.hideSideBar = this.hideSideBar.bind(this);
  }

  componentDidMount() {
    this.setState({
      tracks: [],
      loading: false,
      showInfo: false,
      info: null,
    });
    this.appModel = new AppModel();
    this.appModel.addDataTrack('sequence');
    this.appModel.addDataTrack('GM12878-DNase');
    this.appModel.addDataTrack('K562-DNase');
    this.appModel.addDataTrack('MCF7-DNase');
    this.appModel.addAnnotationTrack('GRCh38_genes');
    this.appModel.addListener(this.updateLoadingState, APP_EVENT_LOADING_STATE_CHANGED);
    this.appModel.addListener(this.updateFocus, APP_EVENT_FOCUS_CHANGED);
  }

  hideSideBar() {
    this.setState({
      showInfo: false,
      info: null,
    });
  }

  updateFocus(event) {
    if (event.data !== null) {
      if (event.data.labels[0][0] === this.state.info) {
        this.hideSideBar();
      } else {
        this.setState({
          showInfo: true,
          info: event.data.labels[0][0],
        });          
      }
    }
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
    const hide = this.hideSideBar;
    const title = this.state.info;
    return (
      <MuiThemeProvider>
        <div className="site-wrapper">
          <Header model={this.appModel} />
          {progress}
          <MultiTrackViewer model={this.appModel} />
          <Drawer width={450} openSecondary={true} open={this.state.showInfo}>
            <AppBar
              title={title}
              iconElementLeft={<IconButton onClick={hide}><NavigationClose /></IconButton>}
            />
          </Drawer>
        </div>
      </MuiThemeProvider>);
  }
}

export default App;
