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
import EntityDetails from '../EntityDetails/EntityDetails.jsx';
import TrackViewSettings from '../TrackViewSettings/TrackViewSettings.jsx';
import MultiTrackViewer from '../MultiTrackViewer/MultiTrackViewer.jsx';
import DatasetSelector from '../DatasetSelector/DatasetSelector.jsx';
import GWASSelector from '../GWASSelector/GWASSelector.jsx';
import GenomeSelector from '../GenomeSelector/GenomeSelector.jsx';
import AppModel, {
  APP_EVENT_LOADING_STATE_CHANGED,
  APP_EVENT_EDIT_TRACK_VIEW_SETTINGS,
  APP_EVENT_SHOW_ENTITY_DETAIL,
  APP_EVENT_ADD_DATASET_BROWSER,
  APP_EVENT_DATA_SET_SELECTED,
} from '../../models/appModel.js';
import {
  TRACK_TYPE_SEQUENCE,
  TRACK_TYPE_FUNCTIONAL,
  TRACK_TYPE_GENOME,
  TRACK_TYPE_GWAS,
  TRACK_TYPE_EQTL,
  TRACK_TYPE_3D,
  TRACK_TYPE_NETWORK,
} from '../../helpers/constants.js';

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
    this.showEntityDetails = this.showEntityDetails.bind(this);
    this.showTrackSettings = this.showTrackSettings.bind(this);
    this.hideSideBar = this.hideSideBar.bind(this);
    this.addDatasetBrowser = this.addDatasetBrowser.bind(this);
    this.dataSetSelected = this.dataSetSelected.bind(this);
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
    this.appModel.addAnnotationTrack('GRCh38');

    this.appModel.addListener(this.updateLoadingState, APP_EVENT_LOADING_STATE_CHANGED);
    this.appModel.addListener(this.showEntityDetails, APP_EVENT_SHOW_ENTITY_DETAIL);
    this.appModel.addListener(this.showTrackSettings, APP_EVENT_EDIT_TRACK_VIEW_SETTINGS);
    this.appModel.addListener(this.addDatasetBrowser, APP_EVENT_ADD_DATASET_BROWSER);
    this.appModel.addListener(this.dataSetSelected, APP_EVENT_DATA_SET_SELECTED);
  }

  hideSideBar() {
    this.setState({
      showInfo: false,
      currSideBarInfo: null,
    });
  }

  showEntityDetails(event) {
    if (event.data !== null) {
      if (event.data.aggregation === true) {
        // if the annotation is an aggregation then zoom
        this.viewModel.setViewRegionUsingRange(event.data.startBp, event.data.endBp);
      } else if (event.data.id === this.state.currSideBarDataID && this.state.showInfo) {
        this.hideSideBar();
      } else {
          let title = '';
          if (event.data.title) {
            title = event.data.title;
          }
          this.setState({
            showInfo: true,
            currSideBarType: SIDEBAR_TYPE_ENTITY_DETAILS,
            currSideBarInfo: title,
            currSideBarDataID: event.data.id,
          });
      }
    }
  }

  addDatasetBrowser() {
    this.setState({
      showInfo: true,
      currSideBarType: SIDEBAR_TYPE_BROWSE_DATA,
      currSideBarInfo: 'Add Track',
    });
  }

  dataSetSelected(event) {
    const trackType = event.data;
    let currSideBarType = '';
    let currSideBarInfo = trackType;
    if (trackType === TRACK_TYPE_SEQUENCE) {
      currSideBarInfo = 'Sequence Track';
    } else if (trackType === TRACK_TYPE_FUNCTIONAL) {
      currSideBarInfo = 'Functional Track';
    } else if (trackType === TRACK_TYPE_GENOME) {
      currSideBarType = SIDEBAR_TYPE_BROWSE_DATA_GENOME;
      currSideBarInfo = 'Genome Elements Track';
    } else if (trackType === TRACK_TYPE_GWAS) {
      currSideBarType = SIDEBAR_TYPE_BROWSE_DATA_GWAS;
      currSideBarInfo = 'GWAS Track';
    } else if (trackType === TRACK_TYPE_EQTL) {
      currSideBarInfo = 'eQTL Track';
    } else if (trackType === TRACK_TYPE_3D) {
      currSideBarInfo = '3D Structure Track';
    } else if (trackType === TRACK_TYPE_NETWORK) {
      currSideBarInfo = 'Network Track';
    }
    this.setState({
      showInfo: true,
      currSideBarType: currSideBarType,
      currSideBarInfo: currSideBarInfo,
    });
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
    } else if (this.state.currSideBarType === SIDEBAR_TYPE_ENTITY_DETAILS) {
      const dataID = this.state.currSideBarDataID;
      return (<EntityDetails appModel={this.appModel} dataID={dataID} />);
    } else if (this.state.currSideBarType === SIDEBAR_TYPE_BROWSE_DATA) {
      return (<DatasetSelector appModel={this.appModel} />);
    } else if (this.state.currSideBarType === SIDEBAR_TYPE_BROWSE_DATA_GENOME) {
      return (<GenomeSelector appModel={this.appModel} />);
    } else if (this.state.currSideBarType === SIDEBAR_TYPE_BROWSE_DATA_GWAS) {
      return (<GWASSelector appModel={this.appModel} />);
    }  else {
      return null;
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
