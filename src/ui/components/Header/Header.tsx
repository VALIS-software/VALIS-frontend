// Dependencies
import * as React from 'react';
// Material-UI

import FlatButton from 'material-ui/FlatButton';
// Material-UI Icons
import IconMenu from 'material-ui/IconMenu';

import MenuItem from 'material-ui/MenuItem';
import CloudUpload from "material-ui/svg-icons/file/cloud-upload";
import ActionTimeline from "material-ui/svg-icons/action/timeline";
import SocialShare from "material-ui/svg-icons/social/share";
// components
import { SiriusApi, QueryBuilder  } from 'valis';
import TokenBox from '../Shared/TokenBox/TokenBox';
import ENCODESelector from '../ENCODESelector/ENCODESelector';
import ENCODESignalSelector from '../ENCODESignalSelector/ENCODESignalSelector';
import UserProfileButton from '../Shared/UserProfileButton/UserProfileButton';
import UserFeedBackButton from '../Shared/UserFeedBackButton/UserFeedBackButton';
import AnalysisSelector from '../AnalysisSelector/AnalysisSelector';
import AnalysisResultSelector from '../AnalysisResultSelector/AnalysisResultSelector';
import UserFilesPanel from '../UserFilesPanel/UserFilesPanel';
// Models
import { App } from '../../../App';
import AppModel from '../../../model/AppModel';
import ViewModel from '../../../model/ViewModel';
// Styles
import './Header.scss';
const logoPath = require('./valis-logo.png');

type Props = {
  viewModel: ViewModel,
  appModel: AppModel,
  userProfile: any // @! todo type
  // callbacks
  onShowShare: () => void,
  style?: React.CSSProperties,
}

type State = {
  availableBiosamples: Set<string>,
  biosampleValue: string,
  isSearching: boolean,
  availableSignals: Set<string>,
  availableAnnotations: Set<string>,
}


const SHARE_TUTORIAL = 'Create a link to your current view that can be shared or embedded';

class Header extends React.Component<Props, State> {

  protected tokenBoxRef: TokenBox;

  constructor(props: Props) {
    super(props);
    this.state = {
      availableBiosamples: new Set<string>(),
      availableAnnotations: new Set<string>(),
      availableSignals: new Set<string>(),
      isSearching: false,
      biosampleValue: null,
    };
  }

  componentDidMount() {
    this.updateAvailableBiosamples();
  }


  updateAvailableBiosamples = () => {
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterSource('ENCODE');
    const annotationQuery = SiriusApi.getDistinctValues('info.biosample', builder.build());
    builder.newInfoQuery();
    builder.filterSource('ENCODEbigwig');
    const signalQuery = builder.build();
    signalQuery.filters['info.assembly'] = 'GRCh38';
    const bigwigQuery = SiriusApi.getDistinctValues('info.biosample', signalQuery);
     Promise.all([annotationQuery, bigwigQuery]).then(results => {
      console.log(results);
      let ann = new Set<string>(results[0]);
      let signals = new Set<string>(results[1]);
      let all = new Set<string>([...results[0], ...results[1]]);
      this.setState({
        availableAnnotations: ann,
        availableSignals: signals,
        availableBiosamples: all,
      });
    }, err=> {
      console.log(err);
    });
  }

  handleUpdateBiosample = (value: any) => {
    this.setState({
      biosampleValue: value,
    });
  }

  getTokenBoxState() {
    if (this.tokenBoxRef != null) {
      return {
        tokens: this.tokenBoxRef.state.tokens,
        text: this.tokenBoxRef.state.searchString,
      }
    } else {
      return {
        tokens: [],
        text: ''
      }
    }
  }

  setTokenBoxState(state: { tokens: Array<any>, text: string}) {
    if (this.tokenBoxRef != null) {
      this.tokenBoxRef.setState({
        tokens: state.tokens,
        searchString: state.text,
      });
      this.tokenBoxRef.autoComplete.current.setState({ searchText: state.text });
    }
  }

  showEncodeAnnotations = () => {
    this.props.viewModel.pushView(
      "ENCODE Annotations",
      null,
      <ENCODESelector biosample={this.state.biosampleValue} appModel={this.props.appModel} viewModel={this.props.viewModel} />
    );
  }
   showEncodeSignals = () => {
    this.props.viewModel.pushView(
      "ENCODE Signals",
      null,
      <ENCODESignalSelector biosample={this.state.biosampleValue} appModel={this.props.appModel} viewModel={this.props.viewModel} />
    );
  }
   hideSearch = () => {
    this.setState({
      isSearching: false,
    });
  }

  openAnalysis = () => {
    this.props.viewModel.pushView('Analysis', '', (<AnalysisSelector appModel={this.props.appModel} />));
  }

  openResults = () => {
    this.props.viewModel.pushView('My Results', '', (<AnalysisResultSelector appModel={this.props.appModel} />));
  }
  
  openUserFiles = () => {
    this.props.viewModel.pushView('Uploaded Files', '', (<UserFilesPanel appModel={this.props.appModel} />));
  }

  render() {
    const analysisButton = <FlatButton style={{color: 'white'}} label="Analysis" icon={(<ActionTimeline/>)} />;
    const userFileButton = <FlatButton style={{color: 'white'}} onClick={this.openUserFiles} label="Upload Data" icon={(<CloudUpload/>)} />;
    const shareButton = <FlatButton onMouseEnter={()=> App.setHelpMessage(SHARE_TUTORIAL)} onMouseLeave={() => App.clearHelpMessage()} style={{color: 'white'}} onClick={this.props.onShowShare} label="Share" icon={(<SocialShare/>)} />;
    return (<div>
        <div className="header" style={{height: '56px', width: '100%'}}>
            <div className="header-item">
            <img style={{ cursor: 'pointer', height: 45, marginTop: 6 }} src={logoPath}/> 
            </div>
            <div className="header-search-box" style={{marginTop: -16}}>
              <TokenBox appModel={this.props.appModel} viewModel={this.props.viewModel} ref={(v) => {this.tokenBoxRef = v}}/>
            </div>
            <div className="header-button">
            <IconMenu
              iconButtonElement={analysisButton}
            >
              <MenuItem value="1" onClick={this.openAnalysis}  primaryText="Create Analysis" />
              <MenuItem value="2" onClick={this.openResults} primaryText="View Results" />
            </IconMenu>
            </div>
            <div className="header-button">{shareButton}</div>
            <div className="header-item"><UserFeedBackButton userProfile={this.props.userProfile} /></div>
            <div className="header-item" style={{marginTop:2}}>
              <UserProfileButton userProfile={this.props.userProfile} />
            </div>
      </div>
    </div>);
  }
}

export default Header;