// Dependencies
import React from 'react';
import MuiThemeProvider from 'material-ui/styles/MuiThemeProvider';
import getMuiTheme from 'material-ui/styles/getMuiTheme';
import LinearProgress from 'material-ui/LinearProgress';

// Components
import Header from '../Header/Header.jsx';
import EntityDetails from '../EntityDetails/EntityDetails.jsx';
import TrackViewSettings from '../TrackViewSettings/TrackViewSettings.jsx';
import MultiTrackViewer from '../MultiTrackViewer/MultiTrackViewer.jsx';
import NavigationController from '../NavigationController/NavigationController.jsx';

import AppModel, {
  APP_EVENT_LOADING_STATE_CHANGED,
  APP_EVENT_EDIT_TRACK_VIEW_SETTINGS,
  APP_EVENT_SHOW_ENTITY_DETAIL,
  APP_EVENT_DATA_SET_SELECTED,
  APP_EVENT_PUSH_VIEW,
  APP_EVENT_POP_VIEW,
} from '../../models/appModel.js';


import ViewModel from '../../models/viewModel.js';
// Styles
import './App.scss';

const _ = require('underscore');

const SIDEBAR_TYPE_TRACK_SETTINGS = 'track-settings';
const SIDEBAR_TYPE_ENTITY_DETAILS = 'entity-details';
const SIDEBAR_TYPE_BROWSE_DATA = 'browse-data';
const SIDEBAR_TYPE_BROWSE_DATA_GWAS = 'browse-data-gwas';
const SIDEBAR_TYPE_BROWSE_DATA_GENOME = 'browse-data-genome';

class App extends React.Component {
  constructor(props) {
    super(props);
    this.updateLoadingState = this.updateLoadingState.bind(this);
  }

  componentDidMount() {
    this.setState({
      tracks: [],
      views: [],
      loading: false,
    });

    this.popView = this.popView.bind(this);
    this.pushView = this.pushView.bind(this);

    this.viewModel = new ViewModel();
    this.appModel = new AppModel();
    this.appModel.addDataTrack('sequence');
    this.appModel.addAnnotationTrack('GRCh38');

    this.appModel.addListener(this.updateLoadingState, APP_EVENT_LOADING_STATE_CHANGED);
    this.appModel.addListener(this.showEntityDetails, APP_EVENT_SHOW_ENTITY_DETAIL);
    this.appModel.addListener(this.showTrackSettings, APP_EVENT_EDIT_TRACK_VIEW_SETTINGS);
    this.appModel.addListener(this.dataSetSelected, APP_EVENT_DATA_SET_SELECTED);
    this.appModel.addListener(this.popView, APP_EVENT_POP_VIEW);
    this.appModel.addListener(this.pushView, APP_EVENT_PUSH_VIEW);
  }

  // showEntityDetails(event) {
  //   if (event.data !== null) {
  //     if (event.data.aggregation === true) {
  //       // if the annotation is an aggregation then zoom
  //       this.viewModel.setViewRegionUsingRange(event.data.startBp, event.data.endBp);
  //     } else if (event.data.id === this.state.currSideBarDataID && this.state.showInfo) {
  //       this.hideSideBar();
  //     } else {
  //         let title = '';
  //         if (event.data.title) {
  //           title = event.data.title;
  //         }
  //         this.setState({
  //           showInfo: true,
  //           currSideBarType: SIDEBAR_TYPE_ENTITY_DETAILS,
  //           currSideBarInfo: title,
  //           currSideBarDataID: event.data.id,
  //         });
  //     }
  //   }
  // }

  popView() {
    const viewsCopy = this.state ? this.state.views.slice() : [];
    viewsCopy.pop();
    this.setState({
      views: viewsCopy,
    });
  }

  pushView(view) {
    const viewsCopy = this.state ? this.state.views.slice() : [];
    viewsCopy.push(view.data);
    this.setState({
      views: viewsCopy,
    });
  }

  // showTrackSettings(event) {
  //   if (event.data !== null) {
  //     if (event.data === this.state.currSideBarInfo) {
  //       this.hideSideBar();
  //     } else {
  //       this.setState({
  //         showInfo: true,
  //         currSideBarType: SIDEBAR_TYPE_TRACK_SETTINGS,
  //         currSideBarInfo: event.data,
  //       });
  //     }
  //   }
  // }

  // renderSidebar() {
  //   if (this.state.currSideBarType === SIDEBAR_TYPE_TRACK_SETTINGS) {
  //     const guid = this.state.currSideBarInfo;
  //     return (<TrackViewSettings guid={guid} model={this.appModel} />);
  //   } else if (this.state.currSideBarType === SIDEBAR_TYPE_ENTITY_DETAILS) {
  //     const dataID = this.state.currSideBarDataID;
  //     return (<EntityDetails appModel={this.appModel} dataID={dataID} />);
  //   } else if (this.state.currSideBarType === SIDEBAR_TYPE_BROWSE_DATA) {
  //     return (<DatasetSelector appModel={this.appModel} />);
  //   } else if (this.state.currSideBarType === SIDEBAR_TYPE_BROWSE_DATA_GENOME) {
  //     return (<GenomeSelector appModel={this.appModel} />);
  //   } else if (this.state.currSideBarType === SIDEBAR_TYPE_BROWSE_DATA_GWAS) {
  //     return (<GWASSelector appModel={this.appModel} />);
  //   }  else {
  //     return null;
  //   }
  // }

  updateLoadingState(event) {
    this.setState({
      loading: event.data,
    });
  }

  render() {
    if (!this.state) return (<div />);
    const color = this.state.loading ? '' : 'transparent';
    const progress =  (<LinearProgress color={color} />);
    const views = this.state.views;

    const title = (this.state.currSideBarType === SIDEBAR_TYPE_TRACK_SETTINGS) ? 'Track Settings' : this.state.currSideBarInfo;
    return (
      <MuiThemeProvider>
        <div className="site-wrapper">
          <Header model={this.appModel} viewModel={this.viewModel} />
          {progress}
          <MultiTrackViewer model={this.appModel} viewModel={this.viewModel} />
          <NavigationController model={this.appModel} views={views} popView={this.popView} pushView={this.pushView} />
        </div>
      </MuiThemeProvider>);
  }
}

export default App;
