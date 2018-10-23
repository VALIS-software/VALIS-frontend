// Dependencies

import * as React from 'react';
import * as PropTypes from 'prop-types';
import Collapsible from '../Shared/Collapsible/Collapsible';
import FlatButton from 'material-ui/FlatButton';
import NavigationRefresh from 'material-ui/svg-icons/navigation/refresh';
import { Canis } from 'valis';

class JobDetails extends React.Component {
  constructor(props) {
    super(props);
    this.appModel = props.appModel;
    this.state = {
      job: null,
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

  showResult = () => {
    window.open(`${Canis.Api.apiUrl}/files/jobfiles/${this.state.job.id}/giggle_heatmap.pdf`);
  }

  render() {
    let jobInfo = 'Loading job status...';
    let link = null;
    if (this.state.job) {
      jobInfo = (<span>
        Status: <b>{this.state.job.status}</b>
        <br/>
        {this.state.job.result ? (<span>Result: <b>{this.state.job.result}</b></span>) : (<FlatButton onClick={this.refresh} style={{color: 'white'}} label="Refresh Status" icon={(<NavigationRefresh/>)} />) }
      </span>)

      if (this.state.job.result === 'Success') {
        link = (<Collapsible onClick={() => this.showResult()} title={'View results'}  isLink={true}/>);
      } 
    }
    const header = (<div className="sidebar-header">
      <div className="sidebar-name">{this.props.job.name}</div>
      <div className="sidebar-description">{jobInfo}</div>
    </div>);

    return (<div className="job-details">
      {header}
      {link}
    </div>);
  }
}
JobDetails.propTypes = {
  job: PropTypes.object,
  appModel: PropTypes.object,
};

export default JobDetails;
