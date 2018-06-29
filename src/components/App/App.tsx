// Dependencies
import * as React from "react";
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import LinearProgress from "material-ui/LinearProgress";


// Components
import IconButton from 'material-ui/IconButton';
import FlatButton from 'material-ui/FlatButton';
import ContentReport from 'material-ui/svg-icons/content/report';
import Header from "../Header/Header.jsx";
import EntityDetails from "../EntityDetails/EntityDetails";
import TrackViewSettings from "../TrackViewSettings/TrackViewSettings.jsx";
import MultiTrackViewer from "../MultiTrackViewer/MultiTrackViewer";
import NavigationController from "../NavigationController/NavigationController.jsx";
import SearchResultsView from '../SearchResultsView/SearchResultsView.jsx';
import SNPDetails from '../SNPDetails/SNPDetails.jsx';
import GWASDetails from '../GWASDetails/GWASDetails.jsx';
import GeneDetails from '../GeneDetails/GeneDetails.jsx';
import TraitDetails from '../TraitDetails/TraitDetails.jsx';
import Dialog from 'material-ui/Dialog';
import BasicTheme from '../../themes/BasicTheme.jsx';
import { ENTITY_TYPE } from '../../helpers/constants.js';
import { QueryParser, buildQueryParser } from '../../helpers/queryparser';


function parseText(text: string): any {
  const geneSuggestions = (text: string, maxResults: number) => {
    return new Promise((resolve, reject) => {
      resolve(['MAOA', 'MAOB', 'PCSK9', 'NF2']);
    })
  };
  const traitSuggestions = (text: string, maxResults: number) => {
    return new Promise((resolve, reject) => {
      resolve(['Cancer', 'Alzheimers', 'Depression']);
    })
  }

  const suggestions = new Map();
  suggestions.set('GENE', geneSuggestions);
  suggestions.set('TRAIT', traitSuggestions);
  const parser: QueryParser = buildQueryParser(suggestions);
  return parser.getSuggestions(text);
}

import AppModel, { AppEvent } from "../../models/appModel";

import ViewModel, {
  VIEW_EVENT_EDIT_TRACK_VIEW_SETTINGS,
  VIEW_EVENT_TRACK_ELEMENT_CLICKED,
  VIEW_EVENT_DISPLAY_TRACK_RESULTS,
  VIEW_EVENT_PUSH_VIEW,
  VIEW_EVENT_POP_VIEW,
  VIEW_EVENT_CLOSE_VIEW,
  VIEW_EVENT_DISPLAY_ENTITY_DETAILS,
} from "../../models/viewModel.js";

import QueryBuilder from "../../models/query.js";

// Styles
import "./App.scss";

class App extends React.PureComponent<any, any> {

  private viewModel: any;
  private appModel: AppModel;

  clickTrackElement = (event: any) => {
    if (event.data !== null) {
      if (event.data.type === "aggregation") {
        // if the annotation is an aggregation then zoom
        this.viewModel.setViewRegionUsingRange(event.data.startBp, event.data.endBp);
      } else if (this.currentView() && event.data.id === this.currentView().info) {
        this.viewModel.popView();
      } else {
        // we start a new view history
        this.viewModel.closeView();
        this.displayEntityDetails(event);
      }
    }
  }

  displayTrackSearchResults = (event: any) => {
    if (event.data !== null) {
      const trackGuid: string = event.data;
      const view = (<SearchResultsView trackGuid={trackGuid} viewModel={this.viewModel} appModel={this.appModel} />);
      this.viewModel.pushView('Search Results', trackGuid, view);
    }
  }


  displayEntityDetails = (event: any) => {
    if (event.data !== null) {
      const entity = event.data;
      const dataID: string = entity.id;
      const entityType: string = entity.type;
      let elem = null;
      if (entityType === ENTITY_TYPE.SNP) {
        elem = (<SNPDetails viewModel={this.viewModel} appModel={this.appModel} snpId={dataID} />);
      } else if (entityType === ENTITY_TYPE.GENE) {
        elem = (<GeneDetails viewModel={this.viewModel} appModel={this.appModel} geneId={dataID} />);
      } else if (entityType === ENTITY_TYPE.TRAIT) {
        elem = (<TraitDetails viewModel={this.viewModel} appModel={this.appModel} traitId={dataID} />);
      } else if (entityType === ENTITY_TYPE.GWAS) {
        elem = (<GWASDetails viewModel={this.viewModel} appModel={this.appModel} assocId={dataID} />);
      } else {
        elem = (<EntityDetails viewModel={this.viewModel} appModel={this.appModel} dataID={dataID} />);
      }
      this.viewModel.pushView('', dataID, elem);
    }
  }

  popView = () => {
    const viewsCopy = this.state ? this.state.views.slice() : [];
    viewsCopy.pop();
    this.setState({
      views: viewsCopy,
    });
  }

  pushView = (view: any) => {
    const viewsCopy = this.state ? this.state.views.slice() : [];
    viewsCopy.push(view.data);
    this.setState({
      views: viewsCopy,
    });
  }

  closeView = () => {
    this.setState({
      views: [],
    });
  }

  currentView() {
    if (!this.state || this.state.views.length === 0) {
      return null;
    }
    return this.state.views[this.state.views.length - 1];
  }

  showTrackSettings(event: any) {
    if (event.data !== null) {
      if (this.currentView() && event.data === this.currentView().info) {
        this.viewModel.popView();
      } else {
        const elem = (<TrackViewSettings guid={event.data} viewModel={this.viewModel} model={this.appModel} />);
        this.viewModel.pushView('Track Settings', event.data, elem);
      }
    }
  }

  updateLoadingState = (event: any) => {
    this.setState({
      loading: event.data,
    });
  }

  reportFailure = (evt: any) => {
    const error: object = evt.data.error;
    const newErrorList = this.state.errors.slice(0);
    newErrorList.push(error);
    this.setState({
      errors: newErrorList,
    });
  }

  componentDidMount() {
    this.setState({
      tracks: [],
      views: [],
      loading: false,
      errors: [],
      displayErrors: false,
    });

    this.viewModel = new ViewModel();
    this.appModel = new AppModel();
    // Default sequence track
    this.appModel.addDataTrack('sequence');
    // Default GRCh38 gene track
    const builder = new QueryBuilder();
    builder.newGenomeQuery();
    builder.filterType('gene');
    const query = builder.build();
    this.appModel.addAnnotationTrack('GRCh38 Genes', query);
    this.appModel.addListener(this.reportFailure, AppEvent.Failure);
    this.appModel.addListener(this.updateLoadingState, AppEvent.LoadingStateChanged);
    this.viewModel.addListener(this.clickTrackElement, VIEW_EVENT_TRACK_ELEMENT_CLICKED);
    this.viewModel.addListener(this.showTrackSettings, VIEW_EVENT_EDIT_TRACK_VIEW_SETTINGS);
    this.viewModel.addListener(this.displayTrackSearchResults, VIEW_EVENT_DISPLAY_TRACK_RESULTS);

    // this.viewModel.addListener(this.dataSetSelected, VIEW_EVENT_DATA_SET_SELECTED); //! method doesn't exist
    this.viewModel.addListener(this.popView, VIEW_EVENT_POP_VIEW);
    this.viewModel.addListener(this.pushView, VIEW_EVENT_PUSH_VIEW);
    this.viewModel.addListener(this.closeView, VIEW_EVENT_CLOSE_VIEW);
    this.viewModel.addListener(this.displayEntityDetails, VIEW_EVENT_DISPLAY_ENTITY_DETAILS);

    parseText('variants');
  }

  displayErrors = () => {
    this.setState({
      displayErrors: true,
    })
  }

  hideErrors = () => {
    this.setState({
      displayErrors: false,
    })
  }

  render() {
    if (!this.state) {
      return (<div />);
    }
    const color = this.state.loading ? '' : 'transparent';
    const progress = (<LinearProgress color={color} />);

    const errorButton = this.state.errors.length > 0 ? (<div className="error-button"><IconButton onClick={this.displayErrors} tooltip="Clear"><ContentReport /></IconButton></div>) : (<div />);

    let errorDialog = (<div />);
    if (this.state.errors.length) {
      let id = 0;
      const errorList = this.state.errors.map((error: object) => {
        return (<div key={'error' + (++id)}>{JSON.stringify(error)}<hr /></div>);
      });


      const actions = [<FlatButton
        label="Cancel"
        primary={true}
        onClick={this.hideErrors}
      />];

      errorDialog = (<Dialog
        title="Errors"
        modal={false}
        open={this.state.displayErrors}
        onRequestClose={this.hideErrors}
        autoScrollBodyContent={true}
        actions={actions}
      >
        {errorList}
      </Dialog>);
    }

    const views = this.state.views;

    return (
      <MuiThemeProvider muiTheme={BasicTheme}>
        <div className="site-wrapper">
          <Header viewModel={this.viewModel} model={this.appModel} />
          {progress}
          <MultiTrackViewer model={this.appModel} viewModel={this.viewModel} />
          <NavigationController viewModel={this.viewModel} views={views} />
          {errorButton}
          {errorDialog}
        </div>
      </MuiThemeProvider>);
  }
}

export default App;
