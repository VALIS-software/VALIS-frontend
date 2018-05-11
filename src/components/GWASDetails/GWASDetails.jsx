// Dependencies
import ReactDOM from 'react-dom';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ASSOCIATION_TYPE } from '../../helpers/constants.js';
import Collapsible from '../Shared/Collapsible/Collapsible.jsx';
import SearchResultsView from '../SearchResultsView/SearchResultsView.jsx';
import Util from '../../helpers/util.js';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import faExternalLinkSquareAlt from '@fortawesome/fontawesome-free-solid/faExternalLinkSquareAlt';
 

// Styles
import './GWASDetails.scss';
import '../Shared/Shared.scss';

class GWASDetails extends Component {
  constructor(props) {
    super(props);
    this.appModel = props.appModel;
    this.viewModel = props.viewModel;
    this.api = this.appModel.api;
    this.state = {};
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState) prevState = {};
    prevState.currentAssocId = nextProps.assocId;
    return prevState;
  }

  loadRelationDetails() {
    const all = this.state.relations.map(r => {
      return this.api.getDetails(r.id);
    });

    Promise.all(all).then(d => {
      console.log(d);
    });
  }

  loadGwasDetails() {
    const assocId = this.state.currentAssocId;
    this.api.getDetails(this.state.currentAssocId).then(detailsData => {
      this.setState({
        loadedAssocId: assocId,
        details: detailsData.details,
        relations: detailsData.relations,
      });
      this.loadRelationDetails();
    }, err => {
      console.log(err);
    });
  }

  render() {
    if (this.state.currentAssocId !== this.state.loadedAssocId) {
      this.loadGwasDetails();
      return (<div />);
    }

    const info = this.state.details.info;

    const openStudy = () => {
      window.open('http://' + info['LINK'], '_blank');
    };

    const openIcon = (<FontAwesomeIcon icon={faExternalLinkSquareAlt} />);
    const readElem = (<span> Read Study {openIcon} </span>);

    return (<div className="gwas-details">
      
      <div className="entity-header">
        <div className="entity-name">{info['DISEASE/TRAIT']}</div>
      </div>
      <Collapsible title="Study Info" open={true}>
        <div className="gwas-info-wrapper">
          <div className="section">
            <div className="section-header"> Description </div>
            <p>{info.description}</p>
            <div className="section-header"> Study </div>
            <p>
              <a onClick={openStudy}><i>{info['FIRST AUTHOR']} et. al, {info.JOURNAL} ({info.DATE.slice(0, 4)}) </i>{openIcon}</a>
            </p>
            <div className="section-header"> Initial Sample Size </div>
            <p>{info['INITIAL SAMPLE SIZE']}</p>
            <div className="section-header"> Replication Sample Size </div>
            <p>{info['REPLICATION SAMPLE SIZE']}</p>
            <div className="section-header"> p-value </div>
            <p>
              <div>{info['p-value']}</div>
            </p>
          </div>
        </div>
      </Collapsible>
    </div>);
  }
}
GWASDetails.propTypes = {
  assocId: PropTypes.string,
  appModel: PropTypes.object,
  viewModel: PropTypes.object,
};

export default GWASDetails;
