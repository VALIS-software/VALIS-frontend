// Dependencies

import * as React from 'react';
import * as PropTypes from 'prop-types';
import Collapsible from '../Shared/Collapsible/Collapsible';
import GenericEntityDetails from '../GenericEntityDetails/GenericEntityDetails';
import GenomicLocation from '../Shared/GenomicLocation/GenomicLocation';
import ZoomToButton from '../Shared/ZoomToButton/ZoomToButton';
import SiriusApi from "sirius/SiriusApi";
import QueryBuilder from "sirius/QueryBuilder";
import EntityType from "sirius/EntityType";
import App from "../../../App";

// Styles
import './GeneDetails.scss';

function prettyPrint(str) {
  if (!str) return '';
  let idx = str.indexOf('[Source:');
  if (idx >= 0) {
    return str.slice(0, idx);
  }
  return str;
}

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
    SiriusApi.getDetails(this.state.currentGeneId).then(detailsData => {
      this.setState({
        loadedGeneId: geneId,
        details: detailsData.details,
        relations: detailsData.relations,
      });
    }, (err) => {
      this.appModel.error(err);
      this.setState({
        error: err,
      });
    });
  }

  buildEqtlQuery() {
    const builder = new QueryBuilder();
    const geneName = this.state.details.name;
    builder.newGenomeQuery();
    builder.filterName(geneName);
    const geneQuery = builder.build()
    builder.newEdgeQuery();
    builder.setToNode(geneQuery);
    const edgeQuery = builder.build();
    builder.newGenomeQuery();
    builder.addToEdge(edgeQuery);
    return builder.build();
  }

  buildIntersectSNPQuery() {
    const details = this.state.details;
    if (!details || !details.contig || !details.start || !details.end) {
      return;
    }
    const builder = new QueryBuilder();
    builder.newGenomeQuery();
    builder.filterType({'$in': ['SNP', 'variant']});
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

  loadQuery(title, query) {
    this.appModel.trackMixPanel("Run gene search link", { 'query': JSON.stringify(query) });
    App.displaySearchResults(query, title);
  }

  renderSearchLink(title, query) {
    return (<Collapsible onClick={() => this.loadQuery(title, query)} title={title} disabled={true} isLink={true}/>);
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
      zoomBtn = (<ZoomToButton contig={details.contig} start={absoluteStart} end={absoluteEnd} padding={0.2} />);
    }
    const location = (<GenomicLocation interactive={true} contig={details.contig} start={details.start} end={details.end} />);
    const description = prettyPrint(info.description);
    const header = (<div className="sidebar-header">
      <div className="sidebar-name">{name}{zoomBtn}</div>
      <div className="sidebar-description">{description}</div>
    </div>);

    const linksData = [];
    const mim = info.omim_id;
    const geneId = info.GeneID;
    const ensemblID = info.gene_id;
    linksData.push(['ENSEMBL', `https://www.ensembl.org/Homo_sapiens/Gene/Summary?db=core;g=${ensemblID}`]);
    if (mim) {
      linksData.push(['OMIM', `https://omim.org/entry/${mim}`]);
    }
    linksData.push(['GeneCards', `http://www.genecards.org/cgi-bin/carddisp.pl?gene=${name}`]);
    linksData.push(['Gene Ontology', `http://amigo.geneontology.org/amigo/search/annotation?q=${name}`]);
    if (geneId) {
      linksData.push(['NCBI Gene', `https://www.ncbi.nlm.nih.gov/gene/${geneId}`]);
      linksData.push(['BioGPS', `http://biogps.org/#goto=genereport&id=${geneId}`]);
      linksData.push(['KEGG', `http://www.genome.jp/dbget-bin/www_bget?hsa+${geneId}`]);
      linksData.push(['Monarch', `https://monarchinitiative.org/gene/NCBIGene:${geneId}`]);
    }
    linksData.push(['MARRVEL', `http://marrvel.org/search/gene/${name}`]);
    linksData.push(['UCSC', `https://genome.ucsc.edu/cgi-bin/hgGene?db=hg38&hgg_chrom=${details.contig}&hgg_gene=uc004dfy.5&hgg_start=${details.start}&hgg_end=${details.end}&hgg_type=knownGene`]);

    const links = linksData.map(link => {
      const openLink = () => {
        window.open(link[1], '_blank');
      };
      return (<div key={link[0]} onClick={openLink} className="row">{link[0]}</div>);
    });

    // prepare eQTL SNP items
    const eqtlList = this.renderSearchLink('eQTL\'s of ' + name, this.buildEqtlQuery());

    // prepare intersecting SNP items
    const intersectSNPList = this.renderSearchLink('Variants of ' + name, this.buildIntersectSNPQuery());

    // prepare GWAS items from intersecting SNPs
    const gwasList = this.renderSearchLink('GWAS relations of ' + name, this.buildIntersectSNPGWASQuery());

    // prepare all traits from GWAS items from intersecting SNPs
    const traitList = this.renderSearchLink('Phenotype relations of ' + name, this.buildIntersectSNPGWASTraitQuery());

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
      <Collapsible title="View Raw Data" open={false}>
        <GenericEntityDetails viewModel={this.viewModel} appModel={this.appModel} dataID={this.props.geneId}/>
      </Collapsible>
    </div>);
  }
}
GeneDetails.propTypes = {
  geneId: PropTypes.string,
  appModel: PropTypes.object,
  viewModel: PropTypes.object,
};

export default GeneDetails;
