
import { Map, Set } from 'immutable';
import { QueryType } from "sirius/QueryBuilder";

export type FilterValue = string;
export enum FilterType {
    DATASET,
    TYPE,
    VARIANT_TAG,
    ALLELE_FREQUENCY,
    P_VALUE,
    CHROMOSOME
}

type FilterValueSet = Set<FilterValue>;

export default class QueryModel  {
    query: any;
    filters: Map<FilterType, FilterValueSet>;

    constructor(query: any, filters?: Map<FilterType, FilterValueSet>, displayTitle?: string) {
        this.query = Object.assign({}, query);
        this.filters = filters ? filters : Map<FilterType, FilterValueSet>();
    }

    toggleSelected(filterType: FilterType, filterValue: FilterValue) : QueryModel {
        if (this.filters.has(filterType) && this.filters.get(filterType).has(filterValue)) {
            let previousFilters = this.filters.get(filterType);
            const newFilterSet = this.filters.set(filterType, previousFilters.remove(filterValue));
            return new QueryModel(this.query, newFilterSet);
        } else {
            let previousFilters = this.filters.get(filterType) ? this.filters.get(filterType) : Set<FilterValue>();
            const newFilterSet = this.filters.set(filterType, previousFilters.add(filterValue));
            return new QueryModel(this.query, newFilterSet);
        }
    }

    getFilteredQuery(): any {
        return QueryModel.applyFilterToQuery(this.query, this.filters);
    }

    setQuery(query: any) : QueryModel {
        return new QueryModel(query, this.filters);
    }

    setFilters(filters: Map<FilterType, FilterValueSet>) : QueryModel {
        return new QueryModel(this.query, filters);
    }

    noneSelected(filterType: FilterType) {
        if (!this.filters.has(filterType)) return true;
        if (this.filters.has(filterType) && this.filters.get(filterType).isEmpty()) return true;
        return false;
    }

    isSelected(filterType: FilterType, filterValue: FilterValue) {
        if (this.noneSelected(filterType) || (this.filters.has(filterType) && this.filters.get(filterType).has(filterValue))) {
            return true;
        } else {
            return false;
        }
    }

    public static equal(queryA: QueryModel, queryB: QueryModel) : boolean {
        // @hack -- TODO: semantically correct query comparison
        if (queryA && !queryB) return false;
        if (!queryA && queryB) return false;
        if (JSON.stringify(queryA.query) !== JSON.stringify(queryB.query)) return false;
        if (JSON.stringify(queryA.filters.toObject()) !== JSON.stringify(queryB.filters.toObject())) return false;
        return true;
    }

    protected static applyFilterToQuery(query: any, filter: Map<FilterType, FilterValueSet>) {
        let filteredQuery = JSON.parse(JSON.stringify(query));
        if (!filter || !query) return filteredQuery;
        if (filter.get(FilterType.DATASET)) {
            const datasets = filter.get(FilterType.DATASET).toArray();
            if (datasets.length === 1) {
                filteredQuery.filters['source'] = datasets[0];
            } else {
                filteredQuery.filters['source'] = { "$in": datasets };
            }
        }
        if (filter.get(FilterType.TYPE)) {
            //  only apply this filter to the top level query if it is a genome query
            if (filteredQuery.type === QueryType.GENOME) {
                const types = filter.get(FilterType.TYPE).toArray();
                if (types.length === 1) {
                    filteredQuery.filters['type'] = types[0];
                } else {
                    filteredQuery.filters['type'] = { "$in": types };
                }
            }
        }
        if (filter.get(FilterType.VARIANT_TAG)) {
            // only apply this filter to the top level query if it is a genome query
            const tags = filter.get(FilterType.VARIANT_TAG).toArray();
            if (tags.length === 1) {
                filteredQuery.filters['info.variant_tags'] = tags[0];
            } else {
                filteredQuery.filters['info.variant_tags'] = { "$in": tags };
            }
        }

        if (filter.get(FilterType.CHROMOSOME)) {
            const contigs = filter.get(FilterType.CHROMOSOME).toArray();
            if (contigs.length === 1) {
                filteredQuery.filters.contig = contigs[0];
            } else {
                filteredQuery.filters.contig = { "$in": contigs };
            }
        }
        return filteredQuery;
    }
}
