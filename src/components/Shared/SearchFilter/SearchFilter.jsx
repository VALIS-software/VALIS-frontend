import * as React from 'react';
import * as PropTypes from 'prop-types';
import './SearchFilter.scss';

const { Map, Set } = require('immutable');

const rootFilterOptions = [
    { title: 'By Dataset', type: 'dataset' },
    { title: 'By Type', type: 'type' },
    { title: 'By Variant Effect', type: 'variant_tag' },
    { title: 'By Allele Frequency', type: 'allele_frequency' },
    { title: 'By p-value', type: 'p_value' }
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

    cancelEdit = () => {
        this.setState({
            currFilterMenu: null,
        });
    }

    saveEdit = () => {
        this.setState({
            currFilterMenu: null,
        });
    }

    loadFilterOptions = (type) => {
        if (this.filterOptionsLoading[type]) return;
        else {
            // TODO: run actual async request for filter type
            this.filterOptionsLoading[type] = new Promise(((resolve, reject) => {
                const filterTypes = [
                    { title: 'TCGA', type: 'tcga' },
                    { title: 'ExAC', type: 'exac' },
                    { title: 'dbSNP', type: 'dbsnp' },
                    { title: 'ENCODE', type: 'encode' },
                    { title: 'GTexPortal', type: 'gtexportal' },
                    { title: 'Clinvar', type: 'clinvar' },
                ];
                setTimeout(resolve, 500, filterTypes);
            })).then(result => {
                this.filterOptionsLoading[type] = false;
                const newMap = this.state.filterOptions.set(type, result);
                this.setState({
                    filterOptions: newMap
                });
            });
        }
    }

    render() {
        let menuItems = null;
        let menuOptions = null;
        if (this.state.currFilterMenu === null) {
            // show the filter selector
            menuItems = rootFilterOptions.map(item => {
                return (<div key={item.title} onClick={() => this.setFilter(item.type)} className="filter-type-chooser">{item.title}</div>);
            });
        } else {
            const filterTypes = this.state.filterOptions.get(this.state.currFilterMenu);
            if (!filterTypes) {
                this.loadFilterOptions(this.state.currFilterMenu);
                menuItems = (<div> Loading...</div>);
            } else {
                menuItems = filterTypes.map(item => {
                    const check = this.isSelected(this.state.currFilterMenu, item.type) ? (<span className="float-right">✔</span>) : (<div />);
                    return (<div key={item.title} onClick={() => this.toggleSelected(this.state.currFilterMenu, item.type)} className="filter-type-chooser">{item.title}{check}</div>);
                });
            }
            menuOptions = (<div className="clearfix">
                <button key="b3" onClick={this.cancelEdit} className="float-right">Cancel</button>
                <button key="b4" onClick={this.saveEdit} className="float-right">Apply</button>
            </div>);
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
};

export default SearchFilter;

