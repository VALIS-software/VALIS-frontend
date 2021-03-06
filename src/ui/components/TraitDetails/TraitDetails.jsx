// Dependencies
import * as React from 'react';
import * as PropTypes from 'prop-types';
import Collapsible from '../Shared/Collapsible/Collapsible';
import Pills from '../Shared/Pills/Pills';
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";
import SearchResultsView from '../SearchResultsView/SearchResultsView';
import GenericEntityDetails from '../GenericEntityDetails/GenericEntityDetails';
import { SiriusApi } from 'valis';
import { QueryBuilder } from 'valis'

// Styles
import './TraitDetails.scss';
import '../Shared/Shared.scss';
import { QueryBuilder } from 'valis';

export const prettyPrint = (string) => {
  if (string.toUpperCase() === string) {
    return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
  }
  return string.charAt(0).toUpperCase() + string.slice(1);
}

class TraitDetails extends React.Component {
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

  buildTraitQuery() {
    const details = this.state.details;
    if (!details || !details.name) {
       return;
    }
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.filterType("trait");
    builder.searchText(details.name);
    const traitQuery = builder.build();
    builder.newEdgeQuery();
    builder.setToNode(traitQuery);
    // builder.filterMaxPValue(0.05);
    const edgeQuery = builder.build();
    builder.newGenomeQuery();
    builder.addToEdge(edgeQuery);
    builder.setSpecialGWASQuery();
    return builder.build();
  }

  loadQuery(title, query, queryTitle) {
    this.appModel.trackMixPanel("Run search", { 'query': JSON.stringify(query) });
    const view = (<SearchResultsView text={queryTitle} query={query} viewModel={this.viewModel} appModel={this.appModel} />);
    this.viewModel.pushView(queryTitle, query, view);
  }

  renderSearchLink(title, query, queryTitle) {
    return (<Collapsible onClick={() => this.loadQuery(title, query, queryTitle)} title={title} disabled={true} isLink={true}/>);
  }

  renderSectionPills(title, data) {
    if (!data) {
      return null;
    }
    if (! Array.isArray(data)) {
      data = [data];
    }
    return (<div className="section">
      <div className="section-header"> {title} </div>
      <div><Pills items={data} /></div>
    </div>);
  }

  render() {
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
    const details = this.state.details;
    if (!details) {
      return <div />;
    }
    const name = prettyPrint(details.name);

    const header = (<div className="sidebar-header">
      <div className="sidebar-name">{name}</div>
      <div className="sidebar-description">{this.state.details.info.description}</div>
    </div>);

    const sources = this.renderSectionPills("Sources", details.source);

    const linksData = [];
    linksData.push(['OMIM', `https://omim.org/search/?search=${escape(name)}`]);

    const links = linksData.map(link => {
      const openLink = () => {
        window.open(link[1], '_blank');
      };
      return (<div key={link[0]} onClick={openLink} className="row">{link[0]}</div>);
    });

    const associations = this.renderSearchLink('Associated Variants', this.buildTraitQuery(), 'variants→' + name);

    return (<div className="trait-details">
      {header}
      <Collapsible title="Basic Info" open={true}>
        <div className="section-wrapper">
          {sources}
        </div>
      </Collapsible>
      <Collapsible title="External References" open={false}>
        {links}
      </Collapsible>
      {associations}
      <Collapsible title="View Raw Data" open={false}>
        <GenericEntityDetails viewModel={this.viewModel} appModel={this.appModel} entity={this.props.entity}/>
      </Collapsible>
    </div>);
  }
}
TraitDetails.propTypes = {
  entity: PropTypes.object,
  appModel: PropTypes.object,
  viewModel: PropTypes.object,
};

export default TraitDetails;
