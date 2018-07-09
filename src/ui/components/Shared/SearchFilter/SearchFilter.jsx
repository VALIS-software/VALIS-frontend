import * as React from 'react';
import * as PropTypes from 'prop-types';
import { DATA_SOURCES, VARIANT_TAGS, FILTER_TYPES } from '../../../helpers/constants.ts';
import QueryBuilder from '../../../models/query.js';

const { Map, Set } = require('immutable');
import './SearchFilter.scss';


const rootFilterOptions = [
    { title: 'By Dataset', type: FILTER_TYPES.DATASET },
    { title: 'By Type', type: FILTER_TYPES.TYPE },
    { title: 'By Variant Effect', type: FILTER_TYPES.VARIANT_TAG },
    // { title: 'By Allele Frequency', type: FILTER_TYPES.ALLELE_FREQUENCY },
    // { title: 'By p-value', type: FILTER_TYPES.P_VALUE }
];

class SearchFilter extends React.Component {
    constructor(props) {
        super(props);
        this.filterOptionsLoading = {};
        this.state = {
            currFilterMenu: null,
            filters: new Map(),
            originalFilter: new Map(),
            filterOptions: new Map(),
        }
    }

    toggleSelected = (filterType, filterValue) => {
        if (this.state.filters.has(filterType) && this.state.filters.get(filterType).has(filterValue)) {
            let previousFilters = this.state.filters.get(filterType);
            const newFilters = this.state.filters.set(filterType, previousFilters.remove(filterValue));
            this.setState({
                filters: newFilters,
            });
        } else {
            let previousFilters = this.state.filters.get(filterType) ? this.state.filters.get(filterType) : new Set();
            const newFilters = this.state.filters.set(filterType, previousFilters.add(filterValue));
            this.setState({
                filters: newFilters,
            });
        }
    }

    noneSelected = (filterType) => {
        if (!this.state.filters.has(filterType)) return true;
        if (this.state.filters.has(filterType) && this.state.filters.get(filterType).isEmpty()) return true;
        return false;
    }

    isSelected = (filterType, filterValue) => {
        if (this.noneSelected(filterType) || (this.state.filters.has(filterType) && this.state.filters.get(filterType).has(filterValue))) {
            return true;
        } else {
            return false;
        }
    }

    cancelFilter = () => {
        this.setState({
            currFilterMenu: null,
            filters: this.state.originalFilter
        });
    }

    setFilter = (type) => {
        this.setState({
            currFilterMenu: type,
        });
    }

    applyFilter = () => {
        this.props.onFinish(this.state.filters);
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        if (!prevState) {
            prevState = {};
        }
        prevState.filters = nextProps.filters || prevState.filters || new Map();
        prevState.originalFilter = prevState.filters;
        return prevState;
    }

    loadFilterOptions = (type) => {
        if (this.filterOptionsLoading[type]) return;
        else {

            let promise = null;
            if (type === FILTER_TYPES.DATASET) {
                promise = new Promise(((resolve, reject) => {
                    resolve(DATA_SOURCES);
                }));
            } else if (type === FILTER_TYPES.VARIANT_TAG) {
                promise = new Promise(((resolve, reject) => {
                    resolve(VARIANT_TAGS);
                }));
            } else if (type === 'type') {
                const builder = new QueryBuilder();
                builder.newGenomeQuery();
                const genomeQuery = builder.build();
                promise = this.props.appModel.api.getDistinctValues('type', genomeQuery)
            }

            this.filterOptionsLoading[type] = promise.then(result => {
                this.filterOptionsLoading[type] = false;
                const newMap = this.state.filterOptions.set(type, result);
                this.setState({
                    filterOptions: newMap,
                });
            });
        }
    }

    render() {
        let menuItems = null;
        let menuOptions = (<div className="clearfix">
            <button onClick={this.cancelFilter} className="float-left">Back</button>
            <button onClick={this.applyFilter} className="float-right">Apply</button>
        </div>);
        if (this.state.currFilterMenu === null) {
            // show the filter selector
            menuItems = rootFilterOptions.map(item => {
                return (<div key={item.title} onClick={() => this.setFilter(item.type)} className="filter-type-chooser">{item.title}</div>);
            });
            menuOptions = (<div className="clearfix">
                <button onClick={this.props.onCancel} className="float-left">Cancel</button>
            </div>);
        } else {
            const filterTypes = this.state.filterOptions.get(this.state.currFilterMenu);
            if (!filterTypes) {
                this.loadFilterOptions(this.state.currFilterMenu);
                menuItems = (<div> Loading...</div>);
            } else {
                menuItems = filterTypes.map(item => {
                    const check = this.isSelected(this.state.currFilterMenu, item) ? (<span className="float-right">✔</span>) : (<div />);
                    return (<div key={item} onClick={() => this.toggleSelected(this.state.currFilterMenu, item)} className="filter-type-chooser">{item}{check}</div>);
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

SearchFilter.propTypes = {
    appModel: PropTypes.object,
    viewModel: PropTypes.object,
    onFinish: PropTypes.func,
    onCancel: PropTypes.func,
};

export default SearchFilter;

