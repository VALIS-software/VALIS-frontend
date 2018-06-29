// Dependencies
import RaisedButton from 'material-ui/RaisedButton';
import { Toolbar, ToolbarGroup } from 'material-ui/Toolbar';
import * as React from 'react';
import AppModel from '../../models/appModel.js';
import ViewModel from '../../models/viewModel.js';
import DatasetSelector from '../DatasetSelector/DatasetSelector.jsx';
import TokenBox from '../Shared/TokenBox/TokenBox';
import './Header.scss';

const dataSourceConfig = {
  text: 'textKey',
  value: 'valueKey',
};

type Props = {
  viewModel: ViewModel,
  model: AppModel,
}

type State = {
  dataSource: Array<string>,
  inputValue: string,
  searchFilter: number,
}

class Header extends React.Component<Props, State> {

  constructor(props: Props) {
    super(props);

    this.state = {
      dataSource: [],
      inputValue: '',
      searchFilter: 1,
    };
  }

  addDatasetBrowser = () => {
    mixpanel.track("Click BROWSE DATA");
    const view = (<DatasetSelector viewModel={this.props.viewModel} appModel={this.props.model} />);
    this.props.viewModel.pushView('Select Dataset', null, view);
  }

  render() {
    const addDatasetBrowser = this.addDatasetBrowser;
    return (<div className="header">
      <Toolbar>
        <ToolbarGroup firstChild={true} style={{ width: '768px' }}>
          <div className="search-box">
            <TokenBox appModel={this.props.model} viewModel={this.props.viewModel} />
          </div>
        </ToolbarGroup>
        <ToolbarGroup>
          <RaisedButton label="Browse Data" primary={true} onClick={addDatasetBrowser} />
        </ToolbarGroup>
      </Toolbar>
    </div>);
  }
}

export default Header;