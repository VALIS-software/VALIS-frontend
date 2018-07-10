export enum QueryType {
  GENOME = 'GenomeNode',
  INFO = 'InfoNode',
  EDGE = 'EdgeNode',
}

export class QueryBuilder {
  query: any;

  constructor(query = {}) {
    this.query = query;
  }

  newGenomeQuery() {
    this.query = {
      type: QueryType.GENOME,
      filters: {},
      toEdges: [],
      arithmetics: [],
    };
  }

  newInfoQuery() {
    this.query = {
      type: QueryType.INFO,
      filters: {},
      toEdges: [],
    };
  }

  newEdgeQuery() {
    this.query = {
      type: QueryType.EDGE,
      filters: {},
      toNode: {},
    };
  }

  filterID(id: string) {
    this.query.filters._id = id;
  }

  filterType(type: string) {
    this.query.filters.type = type;
  }

  filterSource(source: string) {
    this.query.filters.source = source;
  }

  filterContig(contig: string) {
    if (this.query.type !== QueryType.GENOME) {
      throw new Error('filter contig only available for GenomeNodes');
    }
    this.query.filters.contig = contig;
  }

  filterLength(length: string) {
    if (this.query.type !== QueryType.GENOME) {
      throw new Error('Length only available for GenomeNodes');
    }
    this.query.filters.length = length;
  }

  filterName(name: string) {
    this.query.filters.name = name;
  }

  filterMaxPValue(pvalue: number) {
    this.query.filters['info.p-value'] = { '<': pvalue };
  }

  filterBiosample(biosample: string) {
    this.query.filters['info.biosample'] = biosample;
  }

  filterTargets(targets: Array<any>) {
    if (targets.length > 0) {
      this.query.filters['info.targets'] = { $all: targets };
    }
  }

  filterInfotypes(type: any) {
    this.query.filters['info.types'] = type;
  }

  filterAssay(assay: any) {
    this.query.filters['info.assay'] = assay;
  }

  filterOutType(outType: any) {
    this.query.filters['info.outtype'] = outType;
  }

  filterStartBp(start: number) {
    if (this.query.type !== QueryType.GENOME) {
      throw new Error('filterStartBp is only available for an Genome Query.');
    }
    this.query.filters.start = start;
  }

  filterEndBp(end: number) {
    if (this.query.type !== QueryType.GENOME) {
      throw new Error('filterEndBp is only available for an Genome Query.');
    }
    this.query.filters.end = end;
  }

  filterAffectedGene(gene: string) {
    const previous = this.query.filters['variant_affected_genes'] || [];
    this.query.filters['variant_affected_genes'] = { $all: previous.concat([gene]) };
  }

  filterVariantTag(tag: string) {
    const previous = this.query.filters['variant_tags'] || [];
    this.query.filters['variant_tags'] = { $all: previous.concat([tag]) };
  }

  searchText(text: string) {
    this.query.filters.$text = text;
  }

  setLimit(limit: number) {
    this.query.limit = limit;
  }

  addToEdge(edgeQuery: any) {
    if (this.query.type === QueryType.EDGE) {
      throw new Error('Edge can not be connect to another edge.');
    }
    this.query.toEdges.push(edgeQuery);
  }

  setToNode(nodeQuery: any, reverse=false) {
    if (this.query.type !== QueryType.EDGE) {
      throw new Error('toNode is only available for an Edge Query.');
    }
    this.query.toNode = nodeQuery;
    this.query.reverse = reverse;
  }

  addArithmeticIntersect(genomeQuery: any) {
    if (this.query.type !== QueryType.GENOME) {
      throw new Error('Arithmetic is only available for an Genome Query.');
    }
    const ar = {
      'operator': 'intersect',
      'target_queries': [genomeQuery],
    }
    this.query.arithmetics.push(ar);
  }

  addArithmeticWindow(genomeQuery: any, windowSize = 1000) {
    if (this.query.type !== QueryType.GENOME) {
      throw new Error('Arithmetic is only available for an Genome Query.');
    }
    const ar = {
      'operator': 'window',
      'target_queries': [genomeQuery],
      'windowSize': windowSize,
    }
    this.query.arithmetics.push(ar);
  }

  addArithmeticUnion(genomeQuery: any) {
    if (this.query.type !== QueryType.GENOME) {
      throw new Error('Arithmetic is only available for an Genome Query.');
    }
    const ar = {
      'operator': 'union',
      'target_queries': [genomeQuery],
    }
    this.query.arithmetics.push(ar);
  }

  build() {
    return Object.assign({}, this.query);
  }
}

export default QueryBuilder;