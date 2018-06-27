import * as React from 'react';
import * as PropTypes from 'prop-types';
import { DATA_SOURCES, VARIANT_TAGS } from '../../../helpers/constants.js';
import QueryBuilder from '../../../models/query.js';

const { Map, Set } = require('immutable');
import './SearchFilter.scss';


const rootFilterOptions = [
    { title: 'By Dataset', type: 'dataset' },
    { title: 'By Type', type: 'type' },
    { title: 'By Variant Effect', type: 'variant_tag' },
    { title: 'By Allele Frequency', type: 'allele_frequency' },
    { title: 'By p-value', type: 'p_value' }
];

const ALLELE_FREQUENCY_BUCKETS = [
    '< 1/10,000',
    '< 1/1,000',
    '< 1%',
    '< 5%',
    '< 50%',
    '> 50%',
];

const P_VALUE_BUCKETS = [
    '<1e-8',
    '<1e-5',
    '<1e-4',
    '<1e-3',
];

class SearchFilter extends React.Component {
    constructor(props) {
        super(props);
        this.filterOptionsLoading = {};
        this.state = {
            currFilterMenu: null,
            filters: new Map(),
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

    isSelected = (filterType, filterValue) => {
        if (this.state.filters.has(filterType) && this.state.filters.get(filterType).has(filterValue)) {
            return true;
        } else {
            return false;
        }
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
        prevState.filters = nextProps.filters || new Map();
        return prevState;
    }

    loadFilterOptions = (type) => {
        if (this.filterOptionsLoading[type]) return;
        else {

            let promise = null;
            if (type === 'dataset') {
                promise = new Promise(((resolve, reject) => {
                    resolve(DATA_SOURCES);
                }));
            } else if (type === 'variant_tag') {
                promise = new Promise(((resolve, reject) => {
                    resolve(VARIANT_TAGS);
                }));
            } else if (type === 'allele_frequency') {
                promise = new Promise(((resolve, reject) => {
                    resolve(ALLELE_FREQUENCY_BUCKETS);
                }));
            } else if (type === 'p_value') {
                promise = new Promise(((resolve, reject) => {
                    resolve(P_VALUE_BUCKETS);
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

                // By default all filters are enabled:
                const newFilters = this.state.filters;
                if (!this.state.filters.get(type)) newFilters = this.state.filters.set(type, new Set(result));
                this.setState({
                    filterOptions: newMap,
                    filters: newFilters,
                });
            });
        }
    }

    render() {
        let menuItems = null;
        let menuOptions = (<div className="clearfix">
            <button onClick={this.props.onCancel} className="float-left">Cancel</button>
            <button onClick={this.applyFilter} className="float-right">Apply</button>
        </div>);
        if (this.state.currFilterMenu === null) {
            // show the filter selector
            menuItems = rootFilterOptions.map(item => {
                return (<div key={item.title} onClick={() => this.setFilter(item.type)} className="filter-type-chooser">{item.title}</div>);
            });
            menuOptions = null;
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

