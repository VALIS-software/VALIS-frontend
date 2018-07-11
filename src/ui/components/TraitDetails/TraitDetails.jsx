// Dependencies
import * as React from 'react';
import * as PropTypes from 'prop-types';
import Collapsible from '../Shared/Collapsible/Collapsible';
import AssociationList from '../Shared/AssociationList/AssociationList';
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";
import SiriusApi from "sirius/SiriusApi";
// Styles
import './TraitDetails.scss';
import '../Shared/Shared.scss';

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
    this.api = this.appModel.api;
    this.state = {};
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState) prevState = {};
    prevState.currentTraitId = nextProps.traitId;
    return prevState;
  }

  loadTraitDetails() {
    const traitId = this.state.currentTraitId;
    SiriusApi.getDetails(this.state.currentTraitId).then(detailsData => {
      this.setState({
        loadedTraitId: traitId,
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
    if (this.state.currentTraitId !== this.state.loadedTraitId) {
      this.loadTraitDetails();
      return (<div />);
    }

    const details = this.state.details;

    const name = prettyPrint(details.name);

    const header = (<div className="sidebar-header">
      <div className="sidebar-name">{name}</div>
      <div className="sidebar-description">{this.state.details.info.description}</div>
    </div>);

    const linksData = [];
    linksData.push(['OMIM', `https://omim.org/search/?search=${escape(name)}`]);

    const links = linksData.map(link => {
      const openLink = () => {
        window.open(link[1], '_blank');
      };
      return (<div key={link[0]} onClick={openLink} className="row">{link[0]}</div>);
    });

    const associations = (<AssociationList associations={this.state.relations} disableEqtl={true} appModel={this.props.appModel} viewModel={this.props.viewModel} />);

    return (<div className="trait-details">
      {header}
      <Collapsible title="Basic Info" open={true}>
        <div className="section-wrapper">
          <div className="section">
            <div className="section-header"> Source </div>
            {details.source}
          </div>
        </div>
      </Collapsible>
      <Collapsible title="External References" open={false}>
        {links}
      </Collapsible>
      {associations}
    </div>);
  }
}
TraitDetails.propTypes = {
  traitId: PropTypes.string,
  appModel: PropTypes.object,
  viewModel: PropTypes.object,
};

export default TraitDetails;
