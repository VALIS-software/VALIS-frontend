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
import TrackViewSettings from '../TrackViewSettings/TrackViewSettings.jsx';
import MultiTrackViewer from '../MultiTrackViewer/MultiTrackViewer.jsx';
import AppModel, { 
  APP_EVENT_LOADING_STATE_CHANGED,  
  APP_EVENT_EDIT_TRACK_VIEW_SETTINGS,
  APP_EVENT_SHOW_ENTITY_DETAIL,
} from '../../models/appModel.js';

import ViewModel from '../../models/viewModel.js';
// Styles
import './App.scss';

const _ = require('underscore');

const SIDEBAR_TYPE_TRACK_SETTINGS = 'track-settings';
const SIDEBAR_TYPE_ENTITY_DETAILS = 'entity-details';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.updateLoadingState = this.updateLoadingState.bind(this);
    this.showEntityDetails = this.showEntityDetails.bind(this);
    this.showTrackSettings = this.showTrackSettings.bind(this);
    this.hideSideBar = this.hideSideBar.bind(this);
  }

  componentDidMount() {
    this.setState({
      tracks: [],
      loading: false,
      showInfo: false,
      currSideBarInfo: null,
    });
    this.viewModel = new ViewModel();
    this.appModel = new AppModel();
    this.appModel.addDataTrack('sequence');
    this.appModel.addDataTrack('GM12878-DNase');
    this.appModel.addDataTrack('K562-DNase');
    this.appModel.addDataTrack('MCF7-DNase');
    this.appModel.addAnnotationTrack('GRCh38_genes');
    this.appModel.addListener(this.updateLoadingState, APP_EVENT_LOADING_STATE_CHANGED);
    this.appModel.addListener(this.showEntityDetails, APP_EVENT_SHOW_ENTITY_DETAIL);
    this.appModel.addListener(this.showTrackSettings, APP_EVENT_EDIT_TRACK_VIEW_SETTINGS);
  }

  hideSideBar() {
    this.setState({
      showInfo: false,
      currSideBarInfo: null,
    });
  }

  showEntityDetails(event) {
    if (event.data !== null) {
      if (event.data.labels[0][0] === this.state.currSideBarInfo) {
        this.hideSideBar();
      } else {
        this.setState({
          showInfo: true,
          currSideBarType: SIDEBAR_TYPE_ENTITY_DETAILS,
          currSideBarInfo: event.data.labels[0][0],
        });          
      }
    }
  }

  showTrackSettings(event) {
    if (event.data !== null) {
      if (event.data === this.state.currSideBarInfo) {
        this.hideSideBar();
      } else {
        this.setState({
          showInfo: true,
          currSideBarType: SIDEBAR_TYPE_TRACK_SETTINGS,
          currSideBarInfo: event.data,
        });          
      }
    }
  }

  renderSidebar() {
    if (this.state.currSideBarType === SIDEBAR_TYPE_TRACK_SETTINGS) {
      const guid = this.state.currSideBarInfo;
      return (<TrackViewSettings guid={guid} model={this.appModel} />);
    } else {
      return (<div>Entity details</div>);
    }
  }

  updateLoadingState(event) {
    this.setState({
      loading: event.data,
    });
  }

  render() {
    if (!this.state) return (<div />);
    const sidebarContents = this.renderSidebar();
    const color = this.state.loading ? '' : 'transparent';
    const progress =  (<LinearProgress color={color} />);
    const hide = this.hideSideBar;

    const title = (this.state.currSideBarType === SIDEBAR_TYPE_TRACK_SETTINGS) ? 'Track Settings' : this.state.currSideBarInfo;
    return (
      <MuiThemeProvider>
        <div className="site-wrapper">
          <Header model={this.appModel} viewModel={this.viewModel} />
          {progress}
          <MultiTrackViewer model={this.appModel} viewModel={this.viewModel} />
          <Drawer width={300} openSecondary={true} open={this.state.showInfo}>
            <AppBar
              title={title}
              iconElementLeft={<IconButton onClick={hide}><NavigationClose /></IconButton>}
            />
            {sidebarContents}
          </Drawer>
        </div>
      </MuiThemeProvider>);
  }
}

export default App;
