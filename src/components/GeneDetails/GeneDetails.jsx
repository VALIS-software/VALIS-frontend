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
    }, (err) => {
      this.appModel.error(err);
    });
  }

  render() {
    if (this.state.currentGeneId !== this.state.loadedGeneId) {
      this.loadGeneDetails();
      return (<div />);
    }

    const details = this.state.details;
    const info = details.info;
    const name = details.name;

    let zoomBtn = (<div />);

    if (details.contig) {
      const absoluteStart = details.start;
      const absoluteEnd = details.end;
      zoomBtn = (<ZoomToButton viewModel={this.props.viewModel} start={absoluteStart} end={absoluteEnd} padding={0.2} />);
    }

    const location = (<GenomicLocation contig={details.contig} start={details.start} end={details.end} />);

    const header = (<div className="entity-header">
      <div className="entity-name">{name}{zoomBtn}</div>
      <div>{name}</div>
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
      <Collapsible title="Phenotype relations" open={false}>
        TODO
      </Collapsible>
      <Collapsible title="GWAS relations" open={false}>
        TODO
      </Collapsible>
      <Collapsible title="SNPs" open={false}>
        TODO
      </Collapsible>
      <Collapsible title="eQTLs" open={false}>
        TODO
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
