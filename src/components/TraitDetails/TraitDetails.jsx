// Dependencies
import ReactDOM from 'react-dom';
import * as React from 'react';
import * as PropTypes from 'prop-types';
import { ASSOCIATION_TYPE } from '../../helpers/constants.js';
import Collapsible from '../Shared/Collapsible/Collapsible.jsx';
import SearchResultsView from '../SearchResultsView/SearchResultsView.jsx';
import SNPDetails from '../SNPDetails/SNPDetails.jsx';
import Util from '../../helpers/util.js';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import faExternalLinkSquareAlt from '@fortawesome/fontawesome-free-solid/faExternalLinkSquareAlt';
 

// Styles
import './TraitDetails.scss';
import '../Shared/Shared.scss';

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
    prevState.currentGeneId = nextProps.traitId;
    return prevState;
  }
  
  loadTraitDetails() {
    const traitId = this.state.currentGeneId;
    this.api.getDetails(this.state.currentGeneId).then(detailsData => {
      this.setState({
        loadedGeneId: traitId,
        details: detailsData.details,
        relations: detailsData.relations,
      });
    }, err => {
      console.log(err);
    });
  }

  render() {
    if (this.state.currentGeneId !== this.state.loadedGeneId) {
      this.loadTraitDetails();
      return (<div />);
    }

    const info = this.state.details;

    return (<div className="trait-details">Hello 2</div>);
  }
}
TraitDetails.propTypes = {
  traitId: PropTypes.string,
  appModel: PropTypes.object,
  viewModel: PropTypes.object,
};

export default TraitDetails;
