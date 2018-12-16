// Dependencies

import * as React from 'react';
import * as PropTypes from 'prop-types';
import Collapsible from '../Shared/Collapsible/Collapsible';
import FlatButton from 'material-ui/FlatButton';
import RaisedButton from 'material-ui/RaisedButton';
import Dialog from 'material-ui/Dialog';
import NavigationRefresh from 'material-ui/svg-icons/navigation/refresh';
import JobResultDialog from '../JobResultDialog/JobResultDialog';
import { Canis } from 'valis';

class JobDetails extends React.Component {
  constructor(props) {
    super(props);
    this.appModel = props.appModel;
    this.state = {
      job: null,
      showResultDialog: false,
      showConfirmDeleteDialog: false,
    };
  }

  componentDidMount() {
    this.refresh();
  }

  refresh = () => {
    Canis.Api.getJob(this.props.job.id).then(d => {
      this.setState({
        job: d,
      })
    });
  }

  handleOpenDialog = () => {
    this.setState({
      showResultDialog: true,
    })
  }

  handleCloseDialog = () => {
    this.setState({
      showResultDialog: false,
    })
  }

  handleOpenConfirmDialog = () => {
    this.setState({
      showConfirmDeleteDialog: true,
    })
  }

  handleCloseConfirmDialog = () => {
    this.setState({
      showConfirmDeleteDialog: false,
    })
  }

  handleConfirmDelete = () => {
    Canis.Api.deleteJob(this.props.job.id);
    this.setState({
      showConfirmDeleteDialog: false,
    })
    this.appModel.popView();
  }

  render() {
    let jobInfo = 'Loading job status...';
    let link = null;
    let resultDialog = null;
    if (this.state.job) {
      jobInfo = (<span>
        Status: <b>{this.state.job.status}</b>
        <br />
        {this.state.job.result ? (<span>Result: <b>{this.state.job.result}</b></span>) : (<FlatButton onClick={this.refresh} style={{ color: 'white' }} label="Refresh Status" icon={(<NavigationRefresh />)} />)}
      </span>)

      if (this.state.job.status === 'DONE') {
        link = (<Collapsible onClick={this.handleOpenDialog} title={'View results'} isLink={true} />);
        resultDialog = <JobResultDialog job={this.state.job} open={this.state.showResultDialog} handleClose={this.handleCloseDialog} />;
      }
    }
    const header = (<div className="sidebar-header">
      <div className="sidebar-name">{this.props.job.name}</div>
      <div className="sidebar-description">{jobInfo}</div>
    </div>);
    const deleteButton = <RaisedButton
      label="Delete"
      secondary={true}
      onClick={this.handleOpenConfirmDialog}
      style={{ position: "absolute", bottom: "10px", width: "90%", marginLeft: "5%" }}
    />
    const confirmDialogActions = [
      <FlatButton onClick={this.handleCloseConfirmDialog} primary autoFocus>
        Cancel
      </FlatButton>,
      <FlatButton onClick={this.handleConfirmDelete} secondary>
        Confirm
      </FlatButton>
    ];
    const confirmDeleteDialog = <Dialog
      open={this.state.showConfirmDeleteDialog}
      onClose={this.handleCloseConfirmDialog}
      title={"Delete this analysis?"}
      actions={confirmDialogActions}
    >
      Analysis deleted can not be recovered after this.
    </Dialog>
    return (
      <div className="job-details">
        {header}
        {link}
        {deleteButton}
        {resultDialog}
        {confirmDeleteDialog}
      </div>
    );
  }
}
JobDetails.propTypes = {
  job: PropTypes.object.isRequired,
  appModel: PropTypes.object.isRequired,
};

export default JobDetails;
