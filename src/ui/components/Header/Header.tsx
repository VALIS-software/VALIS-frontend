// Dependencies
import * as React from 'react';
// Material-UI
import IconButton from 'material-ui/IconButton';
import FlatButton from 'material-ui/FlatButton';
import { Toolbar, ToolbarGroup, ToolbarTitle } from 'material-ui/Toolbar';
// Material-UI Icons
import Menu from 'material-ui/svg-icons/navigation/menu';
import CloudUpload from "material-ui/svg-icons/file/cloud-upload";
import ActionTimeline from "material-ui/svg-icons/action/timeline";
import SocialShare from "material-ui/svg-icons/social/share";
// components
import TokenBox from '../Shared/TokenBox/TokenBox';
import UserProfileButton from '../Shared/UserProfileButton/UserProfileButton';
import UserFeedBackButton from '../Shared/UserFeedBackButton/UserFeedBackButton';
import AnalysisSelector from '../AnalysisSelector/AnalysisSelector';
import UserFilesPanel from '../UserFilesPanel/UserFilesPanel';
// Models
import AppModel from '../../models/AppModel';
import ViewModel from '../../models/ViewModel';
// Styles
import './Header.scss';
const logoPath = require('./valis-logo.png');

type Props = {
  viewModel: ViewModel,
  appModel: AppModel,
  userProfile: any // @! todo type
  // callbacks
  onShowShare: () => void,
  style: React.CSSProperties,
}

type State = {}

class Header extends React.Component<Props, State> {

  protected tokenBoxRef: TokenBox;

  constructor(props: Props) {
    super(props);
    this.state = {};
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

  openAnalysis = () => {
    this.props.viewModel.pushView('Analysis', '', (<AnalysisSelector appModel={this.props.appModel} />));
  }
  
  openUserFiles = () => {
    this.props.viewModel.pushView('UserFiles', '', (<UserFilesPanel appModel={this.props.appModel} />));
  }

  render() {
    const analysisButton = <FlatButton style={{color: 'white'}} onClick={this.openAnalysis} label="Analyze" icon={(<ActionTimeline/>)} />;
    const userFileButton = <FlatButton style={{color: 'white'}} onClick={this.openUserFiles} label="Upload Data" icon={(<CloudUpload/>)} />;
    const shareButton = <FlatButton style={{color: 'white'}} onClick={this.props.onShowShare} label="Share" icon={(<SocialShare/>)} />;
    return (<div>
        <div className="header" style={{height: '56px', width: '100%'}}>
            <div className="header-item">
            <img style={{ cursor: 'pointer', height: 45, marginTop: 6 }} src={logoPath}/> 
            </div>
            <div className="header-search-box" style={{marginTop: -16}}>
              <TokenBox appModel={this.props.appModel} viewModel={this.props.viewModel} ref={(v) => {this.tokenBoxRef = v}}/>
            </div>
            <div className="header-button">{analysisButton}</div>
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