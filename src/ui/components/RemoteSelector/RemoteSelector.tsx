// Dependencies
import RaisedButton from "material-ui/RaisedButton";
import * as React from "react";
import TextField from 'material-ui/TextField';
import AppModel from "../../../model/AppModel";
import ViewModel from "../../../model/ViewModel";
import { App } from '../../../App';

type Props = {
  appModel: AppModel,
  viewModel: ViewModel,
}

type State = {
  title: string,
  bigwigUrl: string,
}

class RemoteSelector extends React.Component<Props, State> {

  appModel: AppModel;

  constructor(props: Props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
    }

    this.state = {
      title: '',
      bigwigUrl: '',
    };
  }

  handleUpdateTitle = (event: any) => {
    this.setState({
      title: event.target.value,
    });
  }

  handleUpdateBigwig = (event: any) => {
    const url = event.target.value;
    const title = url.slice(url.lastIndexOf('/')+1);
    this.setState({
      bigwigUrl: url,
      title: title,
    });
  }

  addRemoteTrack = () => {
    App.addSignalTrack(this.state.title, this.state.bigwigUrl);
  }

  render() {


    return (
      <div className="track-editor">
        <TextField
          value={this.state.bigwigUrl}
          floatingLabelText="Remote URL"
          onChange={this.handleUpdateBigwig}
          errorText={!this.state.bigwigUrl ? 'This field is required' : ''}
          fullWidth={true}
        />
        
        {this.state.bigwigUrl ? <TextField
            value={this.state.title}
            floatingLabelText="Track Title"
            onChange={this.handleUpdateTitle}
            errorText={!this.state.title ? 'This field is required' : ''}
            fullWidth={true}
          /> : null}
        {" "}
        <br />
        <RaisedButton
          label="Add Track"
          primary={true}
          onClick={() => this.addRemoteTrack()}
          disabled={this.state.bigwigUrl === null || this.state.title === null || this.state.title.length === 0}
          style={{ position: "absolute", left: "0px", bottom: "10px", paddingLeft:"5%", paddingRight:"5%", width: "100%" }}
        />
      </div>
    );
  }
}

export default RemoteSelector;
