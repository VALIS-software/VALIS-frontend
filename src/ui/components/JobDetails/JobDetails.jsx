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
    // QYD: We pre-define some filenames to show as result, fallback to output.txt if not specified
    const { job } = this.state;
    let resultFile = 'output.txt';
    if (job.jobType == 'spark_kaplan_meier') {
      resultFile = 'survival_curve.pdf';
    } else if (job.jobType == 'ld_expansion') {
      resultFile = 'ld_expanded_results.vcf.gz';
    } else if (job.jobType == 'giggle') {
      resultFile = 'giggle_heatmap.pdf';
    }
    window.open(`${Canis.Api.apiUrl}/files/jobfiles/${job.id}/${resultFile}`);
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

      if (this.state.job.status === 'DONE') {
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
  job: PropTypes.object.isRequired,
  appModel: PropTypes.object.isRequired,
};

export default JobDetails;
