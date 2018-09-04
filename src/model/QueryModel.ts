
import { Map, Set } from 'immutable';
import { QueryType } from "sirius/QueryBuilder";

export type FilterValue = string;
export enum FilterType {
    DATASET,
    TYPE,
    VARIANT_TAG,
    CONTIG
}

type FilterValueSet = Set<FilterValue>;

export default class QueryModel  {
    query: any;
    filters: Map<FilterType, FilterValueSet>;

    constructor(query: any) {
        this.query = JSON.parse(JSON.stringify(query));
        this.filters = Map<FilterType, FilterValueSet>();
        this.extractQueryFilters();
    }

    extractQueryFilters(): void {
        // This function will extract certain filters from the query.filters and put into this.filters
        // There are unlimited ways the filters can be formated, we support string and `$in`: array here.
        if (!this.query || !this.query.filters) return;
        const qft = this.query.filters;
        // data source
        if ('source' in qft) {
            const qf = qft.source;
            if (typeof qf === 'string') {
                this.filters = this.filters.set(FilterType.DATASET, Set([qf]));
            } else if (typeof qf === 'object' && qf instanceof Object) {
                if ('$all' in qf) {
                    this.filters = this.filters.set(FilterType.DATASET, Set(qf['$all']));
                } else if ('$in' in qf) {
                    this.filters = this.filters.set(FilterType.DATASET, Set(qf['$in']));
                }
            }
            delete qft.source;
        }
        // type
        if ('type' in qft) {
            const qf = qft.type;
            if (typeof qf === 'string') {
                this.filters = this.filters.set(FilterType.TYPE, Set([qf]));
            } else if (typeof qf === 'object' && qf instanceof Object) {
                if ('$in' in qf) {
                    this.filters = this.filters.set(FilterType.TYPE, Set(qf['$in']));
                }
            }
            delete qft.type;
        }
        // variant tag
        if ('info.variant_tags' in qft) {
            const qf = qft['info.variant_tags'];
            if (typeof qf === 'string') {
                this.filters = this.filters.set(FilterType.VARIANT_TAG, Set([qf]));
            } else if (typeof qf === 'object' && qf instanceof Object) {
                if ('$in' in qf) {
                    this.filters = this.filters.set(FilterType.VARIANT_TAG, Set(qf['$in']));
                }
            }
            delete qft['info.variant_tags'];
        }
        // CONTIG
        if ('contig' in qft) {
            const qf = qft.contig;
            if (typeof qf === 'string') {
                this.filters = this.filters.set(FilterType.CONTIG, Set([qf]));
            } else if (typeof qf === 'object' && qf instanceof Object) {
                if ('$in' in qf) {
                    this.filters = this.filters.set(FilterType.CONTIG, Set(qf['$in']));
                }
            }
            delete qft.contig;
        }
    }

    toggleSelected(filterType: FilterType, filterValue: FilterValue) : QueryModel {
        if (this.filters.has(filterType) && this.filters.get(filterType).has(filterValue)) {
            let previousFilters = this.filters.get(filterType);
            this.filters = this.filters.set(filterType, previousFilters.remove(filterValue));
            return this;
        } else {
            let previousFilters = this.filters.get(filterType) ? this.filters.get(filterType) : Set<FilterValue>();
            this.filters = this.filters.set(filterType, previousFilters.add(filterValue));
            return this;
        }
    }

    getFilteredQuery(): any {
        return QueryModel.applyFilterToQuery(this.query, this.filters);
    }

    setQuery(query: any) : void {
        this.query = query;
    }

    setFilters(filters: Map<FilterType, FilterValueSet>) : void {
        this.filters = filters;
    }

    printFilters(): string {
        let filterStrs: string[] = [];
        if (this.filters.get(FilterType.DATASET)) {
            filterStrs.push(this.filters.get(FilterType.DATASET).join(','));
        }
        if (this.filters.get(FilterType.TYPE)) {
            filterStrs.push(this.filters.get(FilterType.TYPE).join(','));
        }
        if (this.filters.get(FilterType.VARIANT_TAG)) {
            filterStrs.push(this.filters.get(FilterType.VARIANT_TAG).join(','));
        }
        if (this.filters.get(FilterType.CONTIG)) {
            filterStrs.push(this.filters.get(FilterType.CONTIG).join(','));
        }
        return filterStrs.join('; ');
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
                filteredQuery.filters['source'] = { "$all": datasets };
            }
        }
        if (filter.get(FilterType.TYPE)) {
            const types = filter.get(FilterType.TYPE).toArray();
            if (types.length === 1) {
                filteredQuery.filters['type'] = types[0];
            } else {
                filteredQuery.filters['type'] = { "$in": types };
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
        if (filter.get(FilterType.CONTIG)) {
            const contigs = filter.get(FilterType.CONTIG).toArray();
            if (contigs.length === 1) {
                filteredQuery.filters.contig = contigs[0];
            } else {
                filteredQuery.filters.contig = { "$in": contigs };
            }
        }
        return filteredQuery;
    }
}
