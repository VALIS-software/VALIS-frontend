import { QueryType } from "sirius/QueryBuilder";
import { CHROMOSOME_START_BASE_PAIRS, FILTER_TYPES } from "./constants";

class Util {

  static chromosomeNameToIndex(name) {
    const suffix = name.slice(3);
    if (suffix === "X") {
      return 22;
    } else if (suffix === "Y") {
      return 23;
    } else {
      return parseInt(suffix, 10) - 1;
    }
  }

  static chromosomeRelativeToUniversalBasePair(chr, bp) {
    const idx =
      typeof chr !== "string" ? chr - 1 : this.chromosomeNameToIndex(chr);
    return CHROMOSOME_START_BASE_PAIRS[idx] + bp;
  }

  static applyFilterToQuery(query, filter) {
    if (!filter || !query) return query;
    if (filter.get(FILTER_TYPES.DATASET)) {
      const datasets = filter.get(FILTER_TYPES.DATASET).toArray();
      if (datasets.length === 1) {
        query.filters['source'] = datasets[0];
      } else {
        query.filters['source'] = { "$in": datasets };
      }
    }
    if (filter.get(FILTER_TYPES.TYPE)) {
      //  only apply this filter to the top level query if it is a genome query
      if (query.type === QueryType.GENOME) {
        const types = filter.get(FILTER_TYPES.TYPE).toArray();
        if (types.length === 1) {
          query.filters['type'] = types[0];
        } else {
          query.filters['type'] = { "$in": types };
        }
      }
    }
    if (filter.get(FILTER_TYPES.VARIANT_TAG)) {
      // only apply this filter to the top level query if it is a genome query
      const tags = filter.get(FILTER_TYPES.VARIANT_TAG).toArray();
      if (tags.length === 1) {
        query.filters['info.variant_tags'] = tags[0];
      } else {
        query.filters['info.variant_tags'] = { "$in": tags };
      }
    }

    if (filter.get(FILTER_TYPES.CHROMOSOME)) {
      const contigs = filter.get(FILTER_TYPES.CHROMOSOME).toArray();
      if (contigs.length === 1) {
        query.filters.contig = contigs[0];
      } else {
        query.filters.contig = { "$in": contigs };
      }
    }
    /*
    if (filter.get(FILTER_TYPES.P_VALUE)) {
      // if a p-value filter exists, remove it and add this one
      if (query.toEdges[0].filters['info.p-value']) {
        // TODO
      }
    }
    if (filter.get(FILTER_TYPES.ALLELE_FREQUENCY)) {
      // only apply this filter to the top level query if it is a genome query
      if (query.type === QueryType.GENOME) {
        // TODO
      }
    }
    */
    return query;
  }

}

export default Util;
