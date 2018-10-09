// Dependencies
import faExternalLinkSquareAlt from '@fortawesome/fontawesome-free-solid/faExternalLinkSquareAlt';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import * as PropTypes from 'prop-types';
import * as React from 'react';
import { DATA_SOURCE_GWAS } from '../../helpers/constants';
import GenericEntityDetails from "../GenericEntityDetails/GenericEntityDetails";
import Collapsible from '../Shared/Collapsible/Collapsible';
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";
import '../Shared/Shared.scss';
import SNPDetails from '../SNPDetails/SNPDetails';
import { SiriusApi } from 'valis';
// Styles
import './GWASDetails.scss';


class GWASDetails extends React.Component {
  constructor(props) {
    super(props);
    this.appModel = props.appModel;
    this.viewModel = props.viewModel;
    this.state = {};
  }

	componentDidMount() {
		const entity = this.props.entity;
		this.fetchData(entity.id, entity.userFileID);
	}

	componentDidUpdate(prevProps) {
		const entity = this.props.entity;
		if (entity.id !== prevProps.entity.id || entity.userFileID !== prevProps.entity.userFileID) {
			this.fetchData(entity.id, entity.userFileID);
		}
	}

	fetchData(dataID, userFileID) {
		SiriusApi.getDetails(dataID, userFileID).then((detailsData) => {
			this.setState({
				details: detailsData.details,
				relations: detailsData.relations,
			});
		}, (err) => {
			this.appModel.error(this, err);
			this.setState({
				error: err,
			});
		});
	}

  render() {
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
    const details = this.state.details;
    if (!details) {
      return <div />;
    }
    // Fall back to GenericEntityDetails since other source like ClinVar don't have detailed information
    if (this.state.details.source.indexOf(DATA_SOURCE_GWAS) < 0) {
      return (<GenericEntityDetails viewModel={this.viewModel} appModel={this.appModel} entity={this.props.entity} />)
    }

    const name = this.state.details.name;
    const info = this.state.details.info;

    const openStudy = () => {
      window.open('http://' + info['LINK'], '_blank');
    };

    const openIcon = (<FontAwesomeIcon icon={faExternalLinkSquareAlt} />);
    const readElem = (<span> Read Study {openIcon} </span>);

    const snpId = this.state.details.from_id;
    const snpView = (<SNPDetails viewModel={this.props.viewModel} appModel={this.props.appModel} entity={this.props.entity} />);

    return (<div className="gwas-details">

      <div className="sidebar-header">
        <div className="sidebar-name">{info['DISEASE/TRAIT']}</div>
      </div>
      <Collapsible title="Study Info" open={true}>
        <div className="gwas-info-wrapper">
          <div className="section">
            <div className="section-header"> Description </div>
            <p>{name}</p>
            <div className="section-header"> Study </div>
            <p>
              <a onClick={openStudy}><i>{info['FIRST AUTHOR']} et. al, {info.JOURNAL} ({info.DATE.slice(0, 4)}) </i>{openIcon}</a>
            </p>
            <div className="section-header"> Initial Sample Size </div>
            <p>{info['INITIAL SAMPLE SIZE']}</p>
            <div className="section-header"> Replication Sample Size </div>
            <p>{info['REPLICATION SAMPLE SIZE']}</p>
            <div className="section-header"> p-value </div>
            <p>{info['p-value']}</p>
          </div>
        </div>
      </Collapsible>
      <Collapsible title="SNP Info" open={false}>
        {snpView}
      </Collapsible>
      <Collapsible title="View Raw Data" open={false}>
        <GenericEntityDetails viewModel={this.viewModel} appModel={this.appModel} entity={this.props.entity} />
      </Collapsible>
    </div>);
  }
}
GWASDetails.propTypes = {
  entity: PropTypes.object,
  appModel: PropTypes.object,
  viewModel: PropTypes.object,
};

export default GWASDetails;
