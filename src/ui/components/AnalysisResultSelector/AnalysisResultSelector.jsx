// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import DataListItem from "../DataListItem/DataListItem";
import JobDetails from "../JobDetails/JobDetails";
import { Canis } from 'valis';
// Styles
import "./AnalysisResultSelector.scss";


class AnalysisResultSelector extends React.Component {
  constructor(props) {
    super(props);
    this.appModel = props.appModel;
    this.justUpdated = false;
    this.state = {
      dataInfo: [],
      showUpgrade: false,
    };
  }

  componentDidMount() {
    this.fetch();
  }

  componentDidUpdate() {
    // QYD: we need this to update the jobList after a job is deleted
    // break the infinite loop
    if (!this.justUpdated) {
      this.fetch();
      this.justUpdated = true;
    } else {
      this.justUpdated = false;
    }
  }

  fetch() {
    Canis.Api.getJobs('None').then((jobList) => {
      this.setState({
        dataInfo: jobList.reverse()
      })
    });
  }

  handleOpen = (job) => {
    this.props.appModel.viewModel.pushView(
			'Job Status',
			job.id,
			<JobDetails appModel={this.appModel} job={job} />
		)
  }

  render() {
    if (!this.state.dataInfo) {
      return <div />;
    }
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
    const dataInfoBlocks = [];
    const dataInfo = this.state.dataInfo;
    for (const di of dataInfo) {
      dataInfoBlocks.push(
        <DataListItem
          title={di.name}
          description={di.timeCreated}
          onClick={() => this.handleOpen(di)}
          key={di.id}
        />
      );
    }

    return (<div className="dataset-selector">{dataInfoBlocks}</div>);
  }
}

AnalysisResultSelector.propTypes = {
  appModel: PropTypes.object,
};

export default AnalysisResultSelector;
