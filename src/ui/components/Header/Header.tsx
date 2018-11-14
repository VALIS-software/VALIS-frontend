// Dependencies
import * as React from 'react';
// Material-UI

import FlatButton from 'material-ui/FlatButton';
// Material-UI Icons
import Chip from 'material-ui/Chip';
import Select from "react-select";
import { SiriusApi, QueryBuilder  } from 'valis';
import SocialShare from "material-ui/svg-icons/social/share";
// components
import TokenBox from '../Shared/TokenBox/TokenBox';
import ENCODESelector from '../ENCODESelector/ENCODESelector';
import ENCODESignalSelector from '../ENCODESignalSelector/ENCODESignalSelector';
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
  availableBiosamples: Set<string>,
  biosampleValue: string,
  isSearching: boolean,
  availableSignals: Set<string>,
  availableAnnotations: Set<string>,
}

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

  render() {
    const shareButton = <FlatButton style={{color: 'white'}} onClick={this.props.onShowShare} label="Share" icon={(<SocialShare/>)} />;

    const availableBiosamples = this.state.availableBiosamples;

    const biosampleItems = new Array<any>();
    availableBiosamples.forEach(curr => {
      biosampleItems.push(
        { label: curr, value: curr}
      );
    });

    const options = this.state.biosampleValue  && !this.state.isSearching ? (<div style={{marginTop: -4}}>
      {
        this.state.availableSignals.has(this.state.biosampleValue) ?
        (<button onClick={this.showEncodeSignals}>Signal Tracks</button>) : (<button disabled={true}>No signal tracks</button>)
      }
      {
        this.state.availableAnnotations.has(this.state.biosampleValue) ?
        (<button onClick={this.showEncodeAnnotations}>Annotation Tracks</button>) : null
      }
      {
        this.state.availableAnnotations.has(this.state.biosampleValue) ?
        (<button onClick={()=> { this.setState({isSearching: true })}}>Search Nearby</button>) : null
      }
    </div>) : null;

    return (<div>
        <div className="header" style={{height: '56px', width: '100%'}}>
            <div className="header-item">
              <span style={{color: 'white', fontWeight: 'bold', marginLeft: 12}}> ENCODE </span>
            </div>
            <div className="header-search-box">
              <TokenBox appModel={this.props.appModel} viewModel={this.props.viewModel} ref={(v) => {this.tokenBoxRef = v}}/>
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