
const QUERY_TYPE_GENOME = 'GenomeNode';
const QUERY_TYPE_INFO = 'InfoNode';
const QUERY_TYPE_EDGE = 'EdgeNode';

class QueryBuilder {
  constructor() {
    this.query = {};
  }

  newGenomeQuery() {
    this.query = {
      type: QUERY_TYPE_GENOME,
      filters: {},
      toEdges: [],
    };
  }

  newInfoQuery() {
    this.query = {
      type: QUERY_TYPE_INFO,
      filters: {},
      toEdges: [],
    };
  }

  newEdgeQuery() {
    this.query = {
      type: QUERY_TYPE_EDGE,
      filters: {},
      toNode: {},
    };
  }

  filterID(id) {
    this.query.filters._id = id;
  }

  filterType(type) {
    this.query.filters.type = type;
  }

  filterSource(source) {
    this.query.filters.source = source;
  }

  filterContig(contig) {
    if (this.query.type !== QUERY_TYPE_GENOME) {
      throw new Error('filter contig only available for GenomeNodes');
    }
    this.query.filters.contig = contig;
  }

  filterLength(length) {
    if (this.query.type !== QUERY_TYPE_GENOME) {
      throw new Error('Length only available for GenomeNodes');
    }
    this.query.filters.length = length;
  }

  filterName(name) {
    this.query.filters.name = name;
  }

  filterMaxPValue(pvalue) {
    this.query.filters['info.p-value'] = { '<': pvalue };
  }

  filterBiosample(biosample) {
    this.query.filters['info.biosample'] = biosample;
  }

  filterTargets(targets) {
    if (targets.length > 0) {
      this.query.filters['info.targets'] = { $all: targets };
    }
  }

  filterInfotypes(type) {
    this.query.filters['info.types'] = type;
  }

  searchText(text) {
    this.query.filters.$text = text;
  }

  setLimit(limit) {
    this.query.limit = limit;
  }

  addToEdge(edgeQuery) {
    if (this.query.type === QUERY_TYPE_EDGE) {
      throw new Error('Edge can not be connect to another edge.');
    }
    this.query.toEdges.push(edgeQuery);
  }

  setToNode(nodeQuery) {
    if (this.query.type !== QUERY_TYPE_EDGE) {
      throw new Error('toNode is only available for an Edge Query.');
    }
    this.query.toNode = nodeQuery;
  }

  build() {
    return Object.assign({}, this.query);
  }
}


export default QueryBuilder;
export { QUERY_TYPE_GENOME, QUERY_TYPE_INFO, QUERY_TYPE_EDGE };
