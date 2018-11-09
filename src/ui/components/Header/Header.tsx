// Dependencies
import * as React from 'react';
// Material-UI

import FlatButton from 'material-ui/FlatButton';
// Material-UI Icons
import IconMenu from 'material-ui/IconMenu';
import Chip from 'material-ui/Chip';
import Select from "react-select";
import { SiriusApi, QueryBuilder  } from 'valis';
import MenuItem from 'material-ui/MenuItem';
import CloudUpload from "material-ui/svg-icons/file/cloud-upload";
import ActionTimeline from "material-ui/svg-icons/action/timeline";
import SocialShare from "material-ui/svg-icons/social/share";
// components
import TokenBox from '../Shared/TokenBox/TokenBox';
import UserProfileButton from '../Shared/UserProfileButton/UserProfileButton';
import UserFeedBackButton from '../Shared/UserFeedBackButton/UserFeedBackButton';
import ENCODESelector from '../ENCODESelector/ENCODESelector';
import UserFilesPanel from '../UserFilesPanel/UserFilesPanel';
// Models
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
  availableBiosamples: string[],
  biosampleValue: string,
  isSearching: boolean,
  availableSignals: any,
  availableAnnotations: any,
}

class Header extends React.Component<Props, State> {

  protected tokenBoxRef: TokenBox;

  constructor(props: Props) {
    super(props);
    this.state = {
      availableBiosamples: [],
      availableAnnotations: {},
      availableSignals: {},
      isSearching: false,
      biosampleValue: null,
    };
  }

  componentDidMount() {
    this.updateAvailableBiosamples();
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


  updateAvailableBiosamples = () => {
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterSource({ $in: ['ENCODE', 'ENCODEbigwig'] });
    const infoQuery = builder.build();
    SiriusApi.getDistinctValues('info.biosample', infoQuery).then(data => {
      // Keep the current selection of biosample
      let newBiosampleValue = null;
      if (this.state.biosampleValue !== null) {
        const currentBiosample = this.state.biosampleValue;
        newBiosampleValue = data.indexOf(currentBiosample);
        if (newBiosampleValue < 0) {
          newBiosampleValue = null;
        }
      }
      this.setState({
        availableBiosamples: data,
        biosampleValue: newBiosampleValue,
      });
    });
  }

  handleUpdateBiosample = (value: any) => {
    this.setState({
      biosampleValue: value,
    });
  }

  showEncodeAnnotations = () => {
    this.props.viewModel.pushView(
      "ENCODE Annotations",
      null,
      <ENCODESelector appModel={this.props.appModel} viewModel={this.props.viewModel} />
    );
  }

  showEncodeSignals = () => {
    this.props.viewModel.pushView(
      "ENCODE Signals",
      null,
      <ENCODESelector appModel={this.props.appModel} viewModel={this.props.viewModel} />
    );
  }

  hideSearch = () => {
    this.setState({
      isSearching: false,
    });
  }

  render() {
    const shareButton = <FlatButton style={{color: 'white'}} onClick={this.props.onShowShare} label="Share" icon={(<SocialShare/>)} />;
    const availableBiosamples = this.state.availableBiosamples;
    const biosampleItems = [];
    for (let i = 0; i < availableBiosamples.length; i++) {
      biosampleItems.push(
        { label: availableBiosamples[i], value: availableBiosamples[i]}
      );
    }
    

    const options = this.state.biosampleValue  && !this.state.isSearching ? (<div style={{marginTop: -4}}>
      <button onClick={this.showEncodeAnnotations}>Add Annotations</button>
      <button onClick={this.showEncodeSignals}>Add Signal Tracks</button>
      <button onClick={()=> { this.setState({isSearching: true })}}>Search Nearby</button>
    </div>) : null;

    return (<div>
        <div className="header" style={{height: '56px', width: '100%'}}>
            <div className="header-item">
              <span style={{color: 'white', fontWeight: 'bold', marginLeft: 12}}> ENCODE </span>
            </div>
            {this.state.biosampleValue ? 
              <div className="header-item" style={{marginLeft: 12, marginRight: 12}}>
                <Chip onRequestDelete={() => { this.setState({biosampleValue: null})}}> {this.state.biosampleValue} </Chip>
              </div>
              : null
            }
            <div className="header-search-box" style={{marginTop: -16}}>
              <div style={{maxWidth: 300, marginTop: 4, marginLeft: 16}}>
              {this.state.biosampleValue ? null : (<Select
                value={null}
                onChange={(d: any) => this.handleUpdateBiosample(d.value)}
                options={biosampleItems}
                placeholder='Select Biosample'
              />)}
              </div>
              {this.state.biosampleValue && this.state.isSearching ? (<TokenBox onCancel={this.hideSearch} appModel={this.props.appModel} viewModel={this.props.viewModel} ref={(v) => {this.tokenBoxRef = v}}/>) : null}
              {options}
            </div>
            <div className="header-button">
            <span style={{color: 'white', fontSize: 12}}> powered by </span>
            </div>
            <div className="header-button">
              <a href="http://www.valis.bio"><img style={{ cursor: 'pointer', height: 45, marginTop: 6 }} src={logoPath}/></a>
            </div>
            <div className="header-button">{shareButton}</div>
      </div>
    </div>);
  }
}

export default Header;