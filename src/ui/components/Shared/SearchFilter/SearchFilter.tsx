import * as React from 'react';
import { DATA_SOURCES, CHROMOSOME_NAMES } from '../../../helpers/constants';
import { SiriusApi, QueryBuilder } from 'valis';
import QueryModel from '../../../../model/QueryModel';
import { FilterType, FilterValue} from '../../../../model/QueryModel';
import './SearchFilter.scss';


type FilterValuePromise = Promise<void> | undefined;

type State = {
    currFilterMenu: FilterType|undefined,
    filterOptionsLoading: Map<FilterType, FilterValuePromise>,
    filterOptions: Map<FilterType, Array<FilterValue>>
}

type Props = {
    queryModel: QueryModel,
    onFinish: (queryModel: QueryModel) => void,
    onCancel: () => void,
    enabledFilters: Array<FilterType>
}

const rootFilterOptions = [
    { title: 'By Dataset', type: FilterType.DATASET },
    { title: 'By Type', type: FilterType.TYPE },
    { title: 'By Variant Effect', type: FilterType.VARIANT_TAG },
    { title: 'By Chromosome', type: FilterType.CONTIG },
];

class SearchFilter extends React.Component<Props, State> {
    protected editedQueryModel: QueryModel;
    protected filterOptionsLoading : Map<FilterType, FilterValuePromise>;
    
    constructor(props: Props) {
        super(props);
        this.filterOptionsLoading = new Map<FilterType, FilterValuePromise>();
        this.state = {
            currFilterMenu: null,
            filterOptions: new Map(),
            filterOptionsLoading: new Map(),
        }
        this.editedQueryModel = this.props.queryModel;
    }

    closeCurrentFilterMenu = () => {
        this.setState({
            currFilterMenu: null,
        });
    }

    setCurrentFilterMenu = (type: FilterType) => {
        this.setState({
            currFilterMenu: type,
        });
    }

    loadFilterOptions = (type: FilterType) => {
        if (this.filterOptionsLoading.get(type)) return;
        else {
            let promise = null;
            if (type === FilterType.DATASET) {
                promise = new Promise(((resolve, reject) => {
                    resolve(DATA_SOURCES);
                }));
            } else if (type === FilterType.VARIANT_TAG) {
                const builder = new QueryBuilder();
                builder.newInfoQuery();
                const infoQuery = builder.build();
                promise = SiriusApi.getDistinctValues('info.variant_tags', infoQuery);
            } else if (type === FilterType.TYPE) {
                const builder = new QueryBuilder();
                builder.newGenomeQuery();
                const genomeQuery = builder.build();
                promise = SiriusApi.getDistinctValues('type', genomeQuery)
            } else if (type === FilterType.CONTIG) {
                promise = new Promise(((resolve, reject) => {
                    resolve(CHROMOSOME_NAMES);
                }));
            }

            const fetchOptionsPromise = promise.then(result => {
                this.filterOptionsLoading.set(type, null);
                const newMap = this.state.filterOptions.set(type, result);
                this.setState({
                    filterOptions: newMap,
                });
            });

            this.filterOptionsLoading.set(type, fetchOptionsPromise) ;
        }
    }

    updateQueryModel(queryModel: QueryModel) {
        this.editedQueryModel = queryModel;
        this.forceUpdate();
    }

    render() {
        let menuItems = null;
        let menuOptions = (<div className="clearfix">
            <button onClick={() => this.closeCurrentFilterMenu()} className="float-left">Back</button>
            <button onClick={() => this.props.onFinish(this.editedQueryModel)} className="float-right">Apply</button>
        </div>);
        if (this.state.currFilterMenu === null) {
            // show the filter selector
            let options = rootFilterOptions;
            if (this.props.enabledFilters) options = options.filter(d => this.props.enabledFilters.indexOf(d.type) >= 0);
            menuItems = options.map(item => {
                return (<div key={item.title} onClick={() => this.setCurrentFilterMenu(item.type)} className="filter-type-chooser">{item.title}</div>);
            });
            menuOptions = (<div className="clearfix">
                <button onClick={() => this.props.onCancel()} className="float-left">Cancel</button>
            </div>);
        } else {
            const filterTypes = this.state.filterOptions.get(this.state.currFilterMenu);
            if (!filterTypes) {
                this.loadFilterOptions(this.state.currFilterMenu);
                menuItems = (<div> Loading...</div>);
            } else {
                menuItems = filterTypes.map(item => {
                    const check = this.editedQueryModel.isSelected(this.state.currFilterMenu, item) ? (<span className="float-right">✔</span>) : (<div />);
                    return (<div key={item} onClick={() => this.updateQueryModel(this.editedQueryModel.toggleSelected(this.state.currFilterMenu, item))} className="filter-type-chooser">{item}{check}</div>);
                });
            }
        }

        return (<div className="search-filter">
            <div className="filter-menu">
                {menuItems}
            </div>
            {menuOptions}
        </div>);
    }
}

export default SearchFilter;
