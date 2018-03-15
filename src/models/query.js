
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

  filterAssembly(assembly) {
    this.query.filters.assembly = assembly;
  }

  filterType(type) {
    this.query.filters.type = type;
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
