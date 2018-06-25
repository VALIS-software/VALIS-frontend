import * as React from 'react';
import * as PropTypes from 'prop-types';
import './SearchFilter.scss';

const { Map } = require('immutable');

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
            filters: {},
            filterOptions: new Map(),
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
                    { title: 'TCGA', value: 'tcga' },
                    { title: 'ExAC', value: 'exac' },
                    { title: 'dbSNP', value: 'dbsnp' },
                    { title: 'ENCODE', value: 'encode' },
                    { title: 'GTexPortal', value: 'gtexportal' },
                    { title: 'Clinvar', value: 'clinvar' },
                ];
                setTimeout(resolve, 2500, filterTypes);
            })).then(result => {
                const newMap = this.state.filterOptions.setIn(type, result);
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
                return (<div onClick={() => this.setFilter(item.type)} className="filter-type-chooser">{item.title}</div>);
            });
        } else {

            if (!this.state.filterOptions[this.state.currFilterMenu]) {
                this.loadFilterOptions(this.state.currFilterMenu);
                menuItems = (<div> Loading...</div>);
            } else {
                const check = (<span className="float-right">✔</span>);
                let i = 0;
                menuItems = filterTypes.map(item => {
                    ++i;
                    return (<div key={i} onClick={() => this.setFilter(item.type)} className="filter-type-chooser">{item.title}{check}</div>);
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

