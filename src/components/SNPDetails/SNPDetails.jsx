// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Paper from 'material-ui/Paper';
import { ASSOCIATION_TYPE } from '../../helpers/constants.js';
import { Card, CardHeader, CardText } from 'material-ui/Card';
import CircularProgress from 'material-ui/CircularProgress';
import ZoomToButton from '../ZoomToButton/ZoomToButton.jsx';
import Collapsible from '../Shared/Collapsible/Collapsible.jsx';
import EntityDetails from '../EntityDetails/EntityDetails.jsx';
import QueryBuilder, { QUERY_TYPE_INFO } from '../../models/query.js';
import SearchResultsView from '../SearchResultsView/SearchResultsView.jsx';
import Util from '../../helpers/util.js';
// Styles
import './SNPDetails.scss';

const _ = require('underscore');

function CopyableText(props) {
  const style = {
    border: 'none',
  };
  return (<input style={style} className="copyable" type="text" value={props.text} />);
}

CopyableText.propTypes = {
  text: PropTypes.string,
};

function FrequencyBarChart(props) {
  const sorted = _.sortBy(props.data, d => -d.value);
  const rows = sorted.map(row => {
    const p = Math.max(1.0, (100.0 * row.value));
    const widthStyle = {
      width: `${p}%`,
    };
    const label = (100.0 * row.value).toFixed(1) + '%';
    return (<tr>
      <td className="base-pair-label"> { row.key }</td>
      <td className="bar">
        <div style={widthStyle} className={'bar-elem ' + row.key} />
      </td>
      <td className="label">{ label }</td>
    </tr>); 
  });
  return (<table className="frequency-chart">{rows}</table>);
}

FrequencyBarChart.propTypes = {
  data: PropTypes.array,
};

function GeneLink(props) {
  const openLink = () => {
    if (props.geneId) {
      const geneId = `Ggeneid_${props.geneId}`;
      const view = (<EntityDetails dataID={geneId} viewModel={props.viewModel} appModel={props.appModel} />);
      props.viewModel.pushView(props.geneName, props.geneId, view);  
    } else {
      const builder = new QueryBuilder();
      builder.newGenomeQuery();
      builder.filterType('gene');
      builder.filterName(props.geneName);
      builder.setLimit(1);
      const query = builder.build();
      const view = (<SearchResultsView text={props.geneName} query={query} viewModel={props.viewModel}  appModel={props.appModel} />);
      props.viewModel.pushView('Search Results', query, view);
    }
  };
  return (<a className="gene-link" onClick={openLink}>{props.geneName}</a>);
}

GeneLink.propTypes = {
  geneName: PropTypes.string,
  geneId: PropTypes.string,
  viewModel: PropTypes.object,
  appModel: PropTypes.object,
};

class SNPDetails extends Component {
  constructor(props) {
    super(props);
    this.appModel = props.appModel;
    this.viewModel = props.viewModel;
    this.api = this.appModel.api;
    this.state = {};
  }


  static getDerivedStateFromProps(nextProps, prevState) {
    if (!prevState) prevState = {};
    prevState.currentSnpId = nextProps.snpId;
    return prevState;
  }

  loadRelationDetails() {
    const all = this.state.relations.map(r => {
      return this.api.getDetails(r.id).then(d => {
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
          ret.disease = details['DISEASE/TRAIT'];
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
      });
    });
  }

  loadSnpDetails() {
    const snpId = this.state.currentSnpId;
    this.api.getDetails(this.state.currentSnpId).then(detailsData => {
      this.setState({
        loadedSnpId: snpId,
        details: detailsData.details,
        relations: detailsData.relations,
      });
      this.loadRelationDetails();
    }, err => {
      console.log(err);
    });
  }

  render() {
    if (this.state.currentSnpId !== this.state.loadedSnpId) {
      this.loadSnpDetails();
      return (<div />);
    }
    const details = this.state.details;
    const name = this.state.details.name;
    let zoomBtn = (<div />);

    if (details.contig) {
      const absoluteStart = details.start;
      const absoluteEnd = details.end;
      zoomBtn = (<ZoomToButton viewModel={this.props.viewModel} start={absoluteStart} end={absoluteEnd} padding={0.2} />);    
    }

    const chrName = details.contig;
    const start = details.start;
    const end = details.end;
    const locText = `${chrName}:${start}:${end}`;
    const location = (<div className="snp-location"><CopyableText text={locText} /></div>);

    let variantType = (<div className="snp-type snp-type-non-coding">Non-coding Variant</div>);

    if (details.info.mapped_gene) {
      let geneId = null;
      const geneName = details.info.mapped_gene;
      if (details.info.GENEINFO) {
        geneId = details.info.GENEINFO.split(':')[1];  
      }
      const geneLink = (<GeneLink geneName={geneName} geneId={geneId} viewModel={this.props.viewModel} appModel={this.props.appModel} />);
      const type = (<span className="snp-type">{details.info.VC || 'Variant'}</span>);
      variantType = (<div className="snp-type-wrapper">{type} of {geneLink}</div>);
    } else {
      const type = details.info.VC;
      variantType = (<div className="snp-type-wrapper">Non-coding {type}</div>);
    }

    let variantFreqChart = (<div />);

    if (details.info.variant_ref && details.info.variant_alt) {
      // snv : draw an arrow from ref --> alt
      const ref = details.info.variant_ref;
      const alt = details.info.variant_alt;

      if (details.info.TOPMED) {
        const percentages = details.info.TOPMED.split(',').map(d => parseFloat(d));
        const data = [
          { key : ref, value: percentages[0] },
        ];
        let i = 1;
        alt.split(',').forEach(letter => {
          const v = Math.isNaN(percentages[i]) ? 0.0 : percentages[i];
          data.push({ key : letter, value: v });
          i++;
        });
        variantFreqChart = (<FrequencyBarChart data={data} />);
      } else {
        variantFreqChart = (<div> Data not available </div>);
      }
    } else {
      // deletion or insertion: draw + or - symbol plus base pair
      variantFreqChart = (<div> Data not available </div>);
    }

    const snpRS = details.name.toLowerCase();
    const linksData = [];
    linksData.push(['dbSNP', `https://www.ncbi.nlm.nih.gov/snp?term=${snpRS}`]);
    linksData.push(['gnomad', `http://gnomad-beta.broadinstitute.org/awesome?query=${snpRS}`]);
    linksData.push(['SNPedia', `https://www.snpedia.com/index.php?search=${snpRS}`]);
    linksData.push(['ExAC', `http://exac.broadinstitute.org/awesome?query=${snpRS}`]);

    const links = linksData.map(link => {
      const openLink = () => {
        window.open(link[1], '_blank');
      };
      return (<div onClick={openLink}className="row">{link[0]}</div>);
    });


    let gwas = (<Collapsible disabled={true} title="No GWAS Relations" />);

    if (this.state.gwas && this.state.gwas.length > 0) {
      const studies = this.state.gwas.map(d => {
        const openGwas = () => {
          const view = (<EntityDetails dataID={d.id} viewModel={this.props.viewModel} appModel={this.props.appModel} />);
          this.props.viewModel.pushView(d.disease, d.id, view);  
        };
        return (<div onClick={openGwas} className="row">{d.disease}</div>); 
      });
      const title = `GWAS Associations (${studies.length})`;
      gwas = (<Collapsible title={title} open={false}>{studies}</Collapsible>);
    }


    let eqtl = (<Collapsible disabled={true} title="No Quantitative Trait Loci" />);

    if (this.state.eqtl && this.state.eqtl.length > 0) {
      const eqtls = this.state.eqtl.map(d => {
        const openEqtl = () => {
          const view = (<EntityDetails dataID={d.id} viewModel={this.props.viewModel} appModel={this.props.appModel} />);
          this.props.viewModel.pushView('Loci Details', d.id, view);  
        };
        return (<div onClick={openEqtl} className="row">{d.description}</div>); 
      });
      const title = `Quantitative Trait Loci (${eqtls.length})`;
      eqtl = (<Collapsible title={title} open={false}>{eqtls}</Collapsible>);
    }


    return (<div className="snp-details">
      <div className="entity-header">
        <div className="entity-name">{name}{zoomBtn}</div>
      </div>
      <Collapsible title="Basic Info" open={true}>
        <div className="snp-info-wrapper">
          <div className="section">
            <div className="section-header"> Variant Type </div>
            {variantType}
          </div>
          <div className="section">
            <div className="section-header"> Allele Frequency </div>
            {variantFreqChart}
          </div>
          <div className="section">
            <div className="section-header"> Location </div>
            {location}
          </div>
        </div>
      </Collapsible>
      {gwas}
      {eqtl}
      <Collapsible title="External References" open={false}>
        {links}
      </Collapsible>
    </div>);
  }
}

SNPDetails.propTypes = {
  snpId: PropTypes.string,
  appModel: PropTypes.object,
  viewModel: PropTypes.object,
};

export default SNPDetails;
