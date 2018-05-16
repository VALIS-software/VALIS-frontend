import * as React from 'react';
import * as PropTypes from 'prop-types';
import Collapsible from '../Collapsible/Collapsible.jsx';
import { ASSOCIATION_TYPE } from '../../../helpers/constants.js';
import Util from '../../../helpers/util.js';
import './AssociationList.scss';


class AssociationList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      needRefresh: false,
    };
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState) prevState = {};
    prevState.associations = nextProps.associations;
    prevState.needRefresh = true;
    return prevState;
  }

  loadRelationDetails() {
    const all = this.state.associations.map(r => {
      return this.props.appModel.api.getDetails(r.id).then(d => {
        const details = d.details.info;
        const ret = {};
        if (Util.isAssociation(ASSOCIATION_TYPE.EQTL, d.details.from_id, d.details.to_id)) {
          ret.id = d.details['_id'];
          ret.cellType = details.CellType;
          ret.type = ASSOCIATION_TYPE.EQTL;
          ret.description = `Expression in ${details.CellType}`;
        } else if (Util.isAssociation(ASSOCIATION_TYPE.GWAS, d.details.from_id, d.details.to_id)) {
          ret.id = d.details['_id'];
          ret.type = ASSOCIATION_TYPE.GWAS;
          ret.description = details['description'];
          ret.disease = details['DISEASE/TRAIT'] || 'Unspecified Trait';
          ret.author = details['FIRST AUTHOR'];
          ret.journal = details['JOURNAL'];
          ret.date = details['DATE'];
          ret.pvalue = details['p-value'];
          ret.link = details['LINK'];
        }
        return ret;
      });
    });

    Promise.all(all).then(d => {
      this.setState({
        gwas: d.filter(x => x.type === ASSOCIATION_TYPE.GWAS),
        eqtl: d.filter(x => x.type === ASSOCIATION_TYPE.EQTL),
        needRefresh: false,
      });
    });
  }

  render() {

    if (this.state.needRefresh) {
      this.loadRelationDetails();
    }

    let gwas = (<Collapsible disabled={true} title="No GWAS Relations" />);

    if (this.state.gwas && this.state.gwas.length > 0) {
      const studies = this.state.gwas.map(d => {
        const openGwas = () => {
          this.props.viewModel.displayEntityDetails(d);
        };
        return (<div key={d.id} onClick={openGwas} className="row">{d.disease}</div>);
      });
      const title = `GWAS Associations (${studies.length})`;
      gwas = (<Collapsible title={title} open={false}>{studies}</Collapsible>);
    }

    let eqtl = (<Collapsible disabled={true} title="No Quantitative Trait Loci" />);

    if (this.state.eqtl && this.state.eqtl.length > 0) {
      const eqtls = this.state.eqtl.map(d => {
        const openEqtl = () => {
          this.props.viewModel.displayEntityDetails(d);
        };
        return (<div key={d.id} onClick={openEqtl} className="row">{d.description}</div>);
      });
      const title = `Quantitative Trait Loci (${eqtls.length})`;
      eqtl = (<Collapsible title={title} open={false}>{eqtls}</Collapsible>);
    }

    return (<div>
      {gwas}
      {eqtl}
    </div>);
  }
}

AssociationList.propTypes = {
  associations: PropTypes.arrayOf(PropTypes.object),
  appModel: PropTypes.object,
  viewModel: PropTypes.object,
};

export default AssociationList;
