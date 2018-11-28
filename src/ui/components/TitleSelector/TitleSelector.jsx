// Dependencies
import * as React from 'react';
import * as PropTypes from 'prop-types';
import TextField from 'material-ui/TextField';
import FlatButton from 'material-ui/FlatButton';
import Dialog from "material-ui/Dialog";
import NavigationClose from "material-ui/svg-icons/navigation/close";
import IconButton from "material-ui/IconButton";

// Styles
import { App } from '../../../App';


class TitleSelector extends React.Component {
  constructor(props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
      this.api = this.appModel.api;
    }
    this.state = {
      title: '',
    };
  }

  cancel = () => {
    this.setState({
      title: null,
    });
    this.props.onCancel();
  }

  handleUpdateTitle = (event) => {
    this.setState({
      title: event.target.value,
    });
  }

  render() {
    const currTitle = (<div>
        {'Enter Track Title'}
        <IconButton style={{position: 'absolute', right: 0, top: 0}} onClick={()=> { this.cancel()}}>
            <NavigationClose />
        </IconButton>
    </div>);


    const actions = [
      <FlatButton
        label={"Done"}
        primary={true}
        disabled={!this.state.title}
        onClick={() => { this.props.onFinish(this.state.title)}}
      />,
      <FlatButton
        label={"Cancel"}
        primary={true}
        onClick={() => { this.cancel()}}
      />,
    ]

    return (
        <Dialog
          title={currTitle}
          modal={false}
          open={this.props.visible}
          onRequestClose={() => { this.props.onCancel()}}
          autoScrollBodyContent={true}
          actions={actions}
        >
        <TextField
          value={this.state.title}
          floatingLabelText="Track Title"
          onChange={this.handleUpdateTitle}
          errorText={!this.state.title ? 'This field is required' : ''}
          fullWidth={true}
        />
        </Dialog>
    );
  }
}

TitleSelector.propTypes = {
  visible: PropTypes.bool,
  onCancel: PropTypes.func,
  onFinish: PropTypes.func,
};

export default TitleSelector;