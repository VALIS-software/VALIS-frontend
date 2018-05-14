// Dependencies
import ReactDOM from 'react-dom';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { ASSOCIATION_TYPE } from '../../helpers/constants.js';
import Collapsible from '../Shared/Collapsible/Collapsible.jsx';
import SearchResultsView from '../SearchResultsView/SearchResultsView.jsx';
import SNPDetails from '../SNPDetails/SNPDetails.jsx';
import Util from '../../helpers/util.js';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import faExternalLinkSquareAlt from '@fortawesome/fontawesome-free-solid/faExternalLinkSquareAlt';
 

// Styles
import './GeneDetails.scss';
import '../Shared/Shared.scss';

class GeneDetails extends Component {
  constructor(props) {
    super(props);
    this.appModel = props.appModel;
    this.viewModel = props.viewModel;
    this.api = this.appModel.api;
    this.state = {};
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState) prevState = {};
    prevState.currentGeneId = nextProps.geneId;
    return prevState;
  }
  
  loadGeneDetails() {
    const geneId = this.state.currentGeneId;
    this.api.getDetails(this.state.currentGeneId).then(detailsData => {
      this.setState({
        loadedGeneId: geneId,
        details: detailsData.details,
        relations: detailsData.relations,
      });
    }, err => {
      console.log(err);
    });
  }

  render() {
    if (this.state.currentGeneId !== this.state.loadedGeneId) {
      this.loadGeneDetails();
      return (<div />);
    }

    const info = this.state.details;


    return (<div className="gene-details">
      {JSON.stringify(info)}
    </div>);
  }
}
GeneDetails.propTypes = {
  geneId: PropTypes.string,
  appModel: PropTypes.object,
  viewModel: PropTypes.object,
};

export default GeneDetails;
