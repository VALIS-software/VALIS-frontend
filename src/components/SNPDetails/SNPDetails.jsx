// Dependencies
import * as React from 'react';
import * as PropTypes from 'prop-types';
import ZoomToButton from '../Shared/ZoomToButton/ZoomToButton.jsx';
import Collapsible from '../Shared/Collapsible/Collapsible.jsx';
import GenomicLocation from '../Shared/GenomicLocation/GenomicLocation.jsx';
import AssociationList from '../Shared/AssociationList/AssociationList.jsx';
import EntityDetails from '../EntityDetails/EntityDetails';
import GWASDetails from '../GWASDetails/GWASDetails.jsx';
import QueryBuilder, { QUERY_TYPE_INFO } from '../../models/query.js';
import SearchResultsView from '../SearchResultsView/SearchResultsView.jsx';
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails.jsx";
import Util from '../../helpers/util.js';
// Styles
import './SNPDetails.scss';
import '../Shared/Shared.scss';

const _ = require('underscore');

function FrequencyBarChart(props) {
  const sorted = _.sortBy(props.data, d => -d.value);
  const rows = sorted.map(row => {
    const p = Math.max(1.0, (100.0 * row.value));
    const widthStyle = {
      width: `${p}%`,
    };
    const label = (100.0 * row.value).toFixed(1) + '%';
    return (<tr key={row.key}>
      <td className="base-pair-label"> {row.key}</td>
      <td className="bar">
        <div style={widthStyle} className={'bar-elem ' + row.key} />
      </td>
      <td className="label">{label}</td>
    </tr>);
  });
  return (<table className="frequency-chart">
    <tbody>
      {rows}
    </tbody>
  </table>);
}

FrequencyBarChart.propTypes = {
  data: PropTypes.array,
};

function GeneLink(props) {
  const openLink = () => {
    if (props.geneId) {
      const geneId = `Ggeneid_${props.geneId}`;
      props.viewModel.displayEntityDetails(geneId);
    } else {
      const builder = new QueryBuilder();
      builder.newGenomeQuery();
      builder.filterType('gene');
      builder.filterName(props.geneName);
      builder.setLimit(1);
      const query = builder.build();
      const view = (<SearchResultsView text={props.geneName} query={query} viewModel={props.viewModel} appModel={props.appModel} />);
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

class SNPDetails extends React.Component {
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

  loadSnpDetails() {
    const snpId = this.state.currentSnpId;
    this.api.getDetails(this.state.currentSnpId).then(detailsData => {
      this.setState({
        loadedSnpId: snpId,
        details: detailsData.details,
        relations: detailsData.relations,
      });
    }, (err) => {
      this.appModel.error(this, err);
    });
  }

  render() {
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
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

    let location = (<GenomicLocation contig={details.contig} start={details.start} end={details.end} />);

    let variantType = (<div className="snp-type snp-type-non-coding">Non-coding Variant</div>);

    if (details.info.variant_affected_genes) {
      let affectedGenes = details.info.variant_affected_genes;
      if (affectedGenes) {
        const geneLinks = [];
        for (const geneName of affectedGenes) {
          geneLinks.push(<GeneLink key={geneName} geneName={geneName} viewModel={this.props.viewModel} appModel={this.props.appModel} />)
        }
        variantType = (<div className="snp-type-wrapper">{details.type} of {geneLinks}</div>);
      }
    }

    let variantFreqChart = (<div> Data not available </div>);
    if (details.info.variant_ref && details.info.variant_alt) {
      // snv : draw an arrow from ref --> alt
      const ref = details.info.variant_ref;
      const alt = details.info.variant_alt;
      const allele_frequencies = details.info.allele_frequencies;
      if (allele_frequencies) {
        let ref_percentage = 1.0;
        const data = [
          { key: ref, value: ref_percentage },
        ];
        for (const allele in allele_frequencies) => {
          data.push({ key: allele, value: allele_frequencies[allele] });
          ref_percentage = ref_percentage - allele_frequencies[allele];
        });
        data[0].value = ref_percentage;
        variantFreqChart = (<FrequencyBarChart data={data} />);
      }
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
      return (<div key={link[0]} onClick={openLink} className="row">{link[0]}</div>);
    });


    const header = (<div className="entity-header">
      <div className="entity-name">{name}{zoomBtn}</div>
    </div>);

    return (<div className="snp-details">
      {header}
      <Collapsible title="Basic Info" open={true}>
        <div className="section-wrapper">
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
      <AssociationList associations={this.state.relations} appModel={this.props.appModel} viewModel={this.props.viewModel} />
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
