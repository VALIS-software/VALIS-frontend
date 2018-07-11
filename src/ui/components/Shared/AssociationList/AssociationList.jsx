import * as React from 'react';
import * as PropTypes from 'prop-types';
import Collapsible from '../Collapsible/Collapsible';
import './AssociationList.scss';
import EntityType from "sirius/EntityType";


class AssociationList extends React.Component {

  render() {
    const { associations } = this.props;
    const gwasAssociations = [];
    const eqtlAssociations = [];
    if (associations) {
      for (const r of associations) {
        if (r.type === EntityType.GWAS) {
          gwasAssociations.push(r);
        } else if (r.type === EntityType.EQTL) {
          eqtlAssociations.push(r);
        }
      }
    }

    let gwasList = (<Collapsible disabled={true} title="No GWAS Relations" />);

    if (gwasAssociations.length > 0) {
      const studies = gwasAssociations.map(r => {
        const openGwas = () => {
          this.props.viewModel.displayEntityDetails(r);
        };
        return (<div key={r.id} onClick={openGwas} className="row">{r.title + ' ' + r.description}</div>);
      });
      const title = `GWAS Associations (${studies.length})`;
      gwasList = (<Collapsible title={title} open={false}>{studies}</Collapsible>);
    }

    let eqtlList = (<Collapsible disabled={true} title="No Quantitative Trait Loci" />);
    if (this.props.disableEqtl) {
      eqtlList = null;
    } else {
      if (eqtlAssociations.length > 0) {
        const eqtls = eqtlAssociations.map(r => {
          const openEqtl = () => {
            this.props.viewModel.displayEntityDetails(r);
          };
          return (<div key={r.id} onClick={openEqtl} className="row">{r.title}</div>);
        });
        const title = `Quantitative Trait Loci (${eqtls.length})`;
        eqtlList = (<Collapsible title={title} open={false}>{eqtls}</Collapsible>);
      }
    }
    

    return (<div>
      {gwasList}
      {eqtlList}
    </div>);
  }
}

AssociationList.propTypes = {
  disableEqtl: PropTypes.bool,
  associations: PropTypes.arrayOf(PropTypes.object),
  appModel: PropTypes.object,
  viewModel: PropTypes.object,
};

export default AssociationList;
