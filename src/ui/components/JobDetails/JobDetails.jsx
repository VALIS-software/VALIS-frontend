// Dependencies

import * as React from 'react';
import * as PropTypes from 'prop-types';
import Collapsible from '../Shared/Collapsible/Collapsible';
import FlatButton from 'material-ui/FlatButton';
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
    };
  }

	componentDidMount() {
    this.refresh();
  }

  refresh = () => {
    Canis.Api.getJob(this.props.job.id).then(d=> {
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

  render() {
    let jobInfo = 'Loading job status...';
    let link = null;
    let resultDialog = null;
    if (this.state.job) {
      jobInfo = (<span>
        Status: <b>{this.state.job.status}</b>
        <br/>
        {this.state.job.result ? (<span>Result: <b>{this.state.job.result}</b></span>) : (<FlatButton onClick={this.refresh} style={{color: 'white'}} label="Refresh Status" icon={(<NavigationRefresh/>)} />) }
      </span>)

      if (this.state.job.status === 'DONE') {
        link = (<Collapsible onClick={this.handleOpenDialog} title={'View results'}  isLink={true}/>);
        resultDialog = <JobResultDialog job={this.state.job} open={this.state.showResultDialog} handleClose={this.handleCloseDialog} />;
      }
    }
    const header = (<div className="sidebar-header">
      <div className="sidebar-name">{this.props.job.name}</div>
      <div className="sidebar-description">{jobInfo}</div>
    </div>);

    return (
      <div>
        <div className="job-details">
          {header}
          {link}
        </div>
        {resultDialog}
      </div>
    );
  }
}
JobDetails.propTypes = {
  job: PropTypes.object.isRequired,
  appModel: PropTypes.object.isRequired,
};

export default JobDetails;
