// Dependencies
import * as PropTypes from 'prop-types';
import * as React from 'react';
import { QueryBuilder } from 'valis'
import Pills from '../Shared/Pills/Pills';
import GenericEntityDetails from '../GenericEntityDetails/GenericEntityDetails';
import AssociationList from '../Shared/AssociationList/AssociationList';
import Collapsible from '../Shared/Collapsible/Collapsible';
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";
import GenomicLocation from '../Shared/GenomicLocation/GenomicLocation';
import ZoomToButton from '../Shared/ZoomToButton/ZoomToButton';
import { SiriusApi } from 'valis';
import UserFeedBackButton from '../Shared/UserFeedBackButton/UserFeedBackButton';
import App from "../../../App";
// Styles
import './SNPDetails.scss';
import '../Shared/Shared.scss';
import { EntityType } from 'valis';

function FrequencyBarChart(props) {
  const sorted = props.data.slice().sort(((a, b) => b.value - a.value));

  const rows = sorted.map(row => {
    const isUnknown = typeof row.value === 'string' || row.value === undefined;
    const p = isUnknown ? 0.0 : Math.max(1.0, (100.0 * row.value));
    const widthStyle = {
      width: `${p}%`,
    };
    const label = isUnknown ?  '?'  : (100.0 * row.value).toFixed(1) + '%';
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
      const entity = {id: props.geneId, type: EntityType.GENE}
      App.displayEntityDetails(entity);
    } else {
      const builder = new QueryBuilder();
      builder.newGenomeQuery();
      // builder.filterType({'$in': ['gene', 'psudogene', 'ncRNA_gene']});
      builder.filterName(props.geneName);
      builder.setLimit(1);
      const geneQuery = builder.build();
      const geneQuery = builder.build();
      SiriusApi.getQueryResults(geneQuery, false).then(results => {
        if (results.data.length > 0) {
          const entity = results.data[0];
          App.displayEntityDetails(entity);
        } else {
          // this is a temporary solution
          alert("Data not found");
        }
      });
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
    this.state = {
      details: null,
      relations: null,
    };
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

  fetchData(snpId, userFileID) {
    SiriusApi.getDetails(snpId, userFileID).then(detailsData => {
      this.setState({
        details: detailsData.details,
        relations: detailsData.relations,
      });
    }, (err) => {
      this.appModel.error(this, err);
      this.setState({
        error: err,
      })
    });
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
    const name = details.name;
    let zoomBtn = (<div />);

    if (details.contig) {
      const absoluteStart = details.start;
      const absoluteEnd = details.end;
      zoomBtn = (<ZoomToButton contig={details.contig} start={absoluteStart} end={absoluteEnd} padding={0.2} />);
    }

    let location = (<GenomicLocation interactive={true} contig={details.contig} start={details.start} end={details.end} />);

    let variantType = (<div className="snp-type snp-type-non-coding">Non-coding Variant</div>);

    if (details.info.variant_affected_genes) {
      let affectedGenes = details.info.variant_affected_genes;
      if (affectedGenes && affectedGenes.length > 0) {
        const geneLinks = [];
        for (const geneName of affectedGenes) {
          geneLinks.push(<GeneLink key={geneName} geneName={geneName} viewModel={this.props.viewModel} appModel={this.props.appModel} />)
        }
        variantType = (<div className="snp-type-wrapper">Variant of {geneLinks}</div>);
      }
    }

    let variantFreqChart = (<div> Data not available </div>);
    if (details.info.variant_ref && details.info.variant_alt && details.info.allele_frequencies) {
      // snv : draw an arrow from ref --> alt
      const ref = details.info.variant_ref;
      const alt = details.info.variant_alt;
      const allele_frequencies = details.info.allele_frequencies;
      if (allele_frequencies) {
        let ref_percentage = 1.0;
        const data = [
          { key: ref, value: ref_percentage },
        ];
        for (const allele in allele_frequencies) {
          data.push({ key: allele, value: allele_frequencies[allele] });
          ref_percentage = ref_percentage - allele_frequencies[allele];
        };
        data[0].value = ref_percentage;
        variantFreqChart = (<FrequencyBarChart data={data} />);
      }
    } else {
      const ref = details.info.variant_ref;
      const alt = details.info.variant_alt;
      const data = [
        {key: ref, value: undefined},
        {key: alt, value: undefined}
      ];
      variantFreqChart = (<FrequencyBarChart data={data} />);
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
    const dataError = (<UserFeedBackButton label="Report Data Error"/>);
    const nameShortened = name.length > 13 ? name.slice(0, 12) + "..." : name;
    const header = (<div className="sidebar-header">
      <span className="sidebar-name">{nameShortened}{zoomBtn}</span>
    </div>);

    const biotypes = this.renderSectionPills("Affected Bio Types", details.info.variant_affected_bio_types);
    const tags = this.renderSectionPills("Variant Tags", details.info.variant_tags);
    const sources = this.renderSectionPills("Sources", details.source);
    const biosamples = this.renderSectionPills("Biosamples", details.info.biosample);
    const mutationStatus = this.renderSectionPills("Mutation Status", details.info.Mutation_Status);

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
          {biosamples}
          {biotypes}
          {tags}
          {mutationStatus}
          {sources}
          <div className="section center">
            {dataError}
          </div>
        </div>
      </Collapsible>
      <AssociationList associations={this.state.relations} appModel={this.props.appModel} viewModel={this.props.viewModel} />
      <Collapsible title="External References" open={false}>
        {links}
      </Collapsible>
      <Collapsible title="View Raw Data" open={false}>
        <GenericEntityDetails viewModel={this.viewModel} appModel={this.appModel} entity={this.props.entity} />
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
