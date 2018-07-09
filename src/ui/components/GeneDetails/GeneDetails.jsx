// Dependencies
import ReactDOM from 'react-dom';
import * as React from 'react';
import * as PropTypes from 'prop-types';
import Collapsible from '../Shared/Collapsible/Collapsible.jsx';
import GenomicLocation from '../Shared/GenomicLocation/GenomicLocation.jsx';
import ZoomToButton from '../Shared/ZoomToButton/ZoomToButton.jsx';
import Util from '../../helpers/util.js';
import FontAwesomeIcon from '@fortawesome/react-fontawesome';
import faExternalLinkSquareAlt from '@fortawesome/fontawesome-free-solid/faExternalLinkSquareAlt';
import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails.jsx";
import EntityType from "../../../../lib/sirius/EntityType";
import DataListItem from "../DataListItem/DataListItem.jsx";
import QueryBuilder from "../../models/query.js";

// Styles
import './GeneDetails.scss';
import '../Shared/Shared.scss';

class GeneDetails extends React.Component {
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
      this.loadIntersectSNPs();
      this.loadIntersectSNPGWAS();
      this.loadIntersectSNPGWASTraits();
    }, (err) => {
      this.appModel.error(err);
      this.setState({
        error: err,
      });
    });
  }

  buildIntersectSNPQuery() {
    const details = this.state.details;
    if (!details || !details.contig || !details.start || !details.end) {
      return;
    }
    const builder = new QueryBuilder();
    builder.newGenomeQuery();
    builder.filterType('SNP');
    builder.filterContig(details.contig);
    builder.filterStartBp({'>=': details.start, '<=': details.end});
    return builder.build();
  }

  buildIntersectSNPGWASQuery() {
    const intersectSNPquery = this.buildIntersectSNPQuery();
    if (!intersectSNPquery) {
      return;
    }
    const builder = new QueryBuilder();
    builder.newEdgeQuery();
    builder.filterType(EntityType.GWAS);
    builder.setToNode(intersectSNPquery, true);
    return builder.build();
  }

  buildIntersectSNPGWASTraitQuery() {
    const intersectSNPGWASQuery = this.buildIntersectSNPGWASQuery();
    if (!intersectSNPGWASQuery) {
      return;
    }
    const builder = new QueryBuilder();
    builder.newInfoQuery();
    builder.addToEdge(intersectSNPGWASQuery);
    return builder.build();
  }

  loadIntersectSNPs() {
    const intersectSNPquery = this.buildIntersectSNPQuery();
    if (!intersectSNPquery) {
      return;
    }
    // For gene like SOX5, there are more than 100k results, here we show the first 50
    this.api.getQueryResults(intersectSNPquery, false, 0, 50).then(results => {
      const intersectSNPs = [];
      for (const d of results.data) {
        intersectSNPs.push({
          title: d.name,
          description: d.info.description,
          id: d.id,
          type: d.type,
        })
      }
      this.setState({
        intersectSNPs: intersectSNPs,
      })
    }, (err) => {
      this.appModel.error(err);
      this.setState({
        error: err,
      });
    });
  }

  loadIntersectSNPGWAS() {
    const intersectSNPGWASQuery = this.buildIntersectSNPGWASQuery();
    if (!intersectSNPGWASQuery) {
      return;
    }
    this.api.getQueryResults(intersectSNPGWASQuery, false, 0, 50).then(results => {
      const intersectSNPGWASs = [];
      for (const d of results.data) {
        intersectSNPGWASs.push({
          title: d.name,
          description: d.info.description,
          id: d.id,
          type: d.type,
        })
      }
      this.setState({
        intersectSNPGWASs: intersectSNPGWASs,
      })
    }, (err) => {
      this.appModel.error(err);
      this.setState({
        error: err,
      });
    });
  }

  loadIntersectSNPGWASTraits() {
    const intersectSNPGWASTraitQuery = this.buildIntersectSNPGWASTraitQuery();
    if (!intersectSNPGWASTraitQuery) {
      return;
    }
    this.api.getQueryResults(intersectSNPGWASTraitQuery, false, 0, 50).then(results => {
      const intersectSNPGWASTraits = [];
      for (const d of results.data) {
        intersectSNPGWASTraits.push({
          title: d.name,
          description: d.info.description,
          id: d.id,
          type: d.type,
        })
      }
      this.setState({
        intersectSNPGWASTraits: intersectSNPGWASTraits,
      })
    }, (err) => {
      this.appModel.error(err);
      this.setState({
        error: err,
      });
    });
  }

  renderCollapsible(title, dataList) {
    if (!dataList || dataList.length === 0) {
      const noTitle = 'No ' + title;
      return (<Collapsible title={noTitle} disabled={true}/>);
    }
    const titleWithNumber = title + ` (${dataList.length})`;
    const dataItems = dataList.map(r => {
      return (
        <DataListItem
          title={r.title}
          description={r.description}
          onClick={() => this.viewModel.displayEntityDetails(r)}
          key={r.id}
        />
      );
    });
    return (
      <Collapsible title={titleWithNumber} open={false}>
        {dataItems}
      </Collapsible>
    );
  }

  render() {
    if (this.state.error) {
      return (<ErrorDetails error={this.state.error} />);
    }
    if (this.state.currentGeneId !== this.state.loadedGeneId) {
      this.loadGeneDetails();
      return (<div />);
    }

    const details = this.state.details;
    const relations = this.state.relations;
    const info = details.info;
    const name = details.name;

    let zoomBtn = (<div />);

    if (details.contig) {
      const absoluteStart = details.start;
      const absoluteEnd = details.end;
      zoomBtn = (<ZoomToButton viewModel={this.props.viewModel} start={absoluteStart} end={absoluteEnd} padding={0.2} />);
    }

    const location = (<GenomicLocation contig={details.contig} start={details.start} end={details.end} />);

    const header = (<div className="sidebar-header">
      <div className="sidebar-name">{name}{zoomBtn}</div>
    </div>);


    const linksData = [];
    const mim = info.MIM;
    const geneId = info.GeneID;
    linksData.push(['OMIM', `https://omim.org/entry/${mim}`]);
    linksData.push(['GeneCards', `http://www.genecards.org/cgi-bin/carddisp.pl?gene=${name}`]);
    linksData.push(['Gene Ontology', `http://amigo.geneontology.org/amigo/search/annotation?q=${name}`]);
    linksData.push(['NCBI Gene', `https://www.ncbi.nlm.nih.gov/gene/${geneId}`]);
    linksData.push(['BioGPS', `http://biogps.org/#goto=genereport&id=${geneId}`]);
    linksData.push(['KEGG', `http://www.genome.jp/dbget-bin/www_bget?hsa+${geneId}`]);
    linksData.push(['Monarch', `https://monarchinitiative.org/gene/NCBIGene:${geneId}`]);
    linksData.push(['MARRVEL', `http://marrvel.org/search/gene/${name}`]);
    linksData.push(['UCSC', `https://genome.ucsc.edu/cgi-bin/hgGene?db=hg38&hgg_chrom=${details.contig}&hgg_gene=uc004dfy.5&hgg_start=${details.start}&hgg_end=${details.end}&hgg_type=knownGene`]);

    const links = linksData.map(link => {
      const openLink = () => {
        window.open(link[1], '_blank');
      };
      return (<div key={link[0]} onClick={openLink} className="row">{link[0]}</div>);
    });

    // prepare eQTL SNP items
    const eqtlRelations = relations.filter(r => r.type === EntityType.EQTL);
    const eqtlList = this.renderCollapsible('Quantitative Trait Loci', eqtlRelations);

    // prepare intersecting SNP items
    const intersectSNPList = this.renderCollapsible('Intersect SNPs', this.state.intersectSNPs);

    // prepare GWAS items from intersecting SNPs
    const gwasList = this.renderCollapsible('GWAS relations', this.state.intersectSNPGWASs);

    // prepare all traits from GWAS items from intersecting SNPs
    const traitList = this.renderCollapsible('Phenotype relations', this.state.intersectSNPGWASTraits);

    return (<div className="gene-details">
      {header}
      <Collapsible title="Basic Info" open={true}>
        <div className="section-wrapper">
          <div className="section">
            <div className="section-header"> Gene Type </div>
            {info.gene_biotype}
          </div>
          <div className="section">
            <div className="section-header"> Strand </div>
            {info.strand}
          </div>
          <div className="section">
            <div className="section-header"> Phase </div>
            {info.phase}
          </div>
          <div className="section">
            <div className="section-header"> Location </div>
            {location}
          </div>
        </div>
      </Collapsible>
      <Collapsible title="External References" open={false}>
        {links}
      </Collapsible>
      {traitList}
      {gwasList}
      {intersectSNPList}
      {eqtlList}
    </div>);
  }
}
GeneDetails.propTypes = {
  geneId: PropTypes.string,
  appModel: PropTypes.object,
  viewModel: PropTypes.object,
};

export default GeneDetails;
