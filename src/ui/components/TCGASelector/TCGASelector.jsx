// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";

import Select from 'react-select';

import RaisedButton from "material-ui/RaisedButton";
import TableView, { TableViewDataResult } from '../Shared/TableView/TableView';
import { QueryBuilder, SiriusApi } from 'valis';
import SelectField from "material-ui/SelectField";
import { DATA_SOURCE_TCGA } from "../../helpers/constants";
import { App } from '../../../App';

import { CANCER_NAMES, CANCER_NAME_MAP, GENDER_NAMES, VITAL_STATUS_NAMES, VITAL_STATUS_MAP, GENDER_NAME_MAP, MIN_AGE, MAX_AGE } from './TCGAConstants';
// Styles

import './TCGASelector.scss';


class TCGASelector extends React.Component {

  constructor(props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
      this.api = this.appModel.api;
    }
    this.state = {
      filterState: '',
    };

    this.filters = new Map();
    this.ageFilter = { '>=': MIN_AGE, '<=': MAX_AGE };
  }

  buildPatientQuery = () => {
    let patientQuery = this.props.patientQuery;

    if (!patientQuery) {
        const builder = new QueryBuilder();
        builder.newInfoQuery();
        builder.filterType("patient");
        patientQuery = builder.build();
    }

    this.filters.forEach((v, k) => {
        patientQuery.filters[k] = v;
    });
    if (this.ageFilter['>='] > MIN_AGE || this.ageFilter['<='] < MAX_AGE) {
        patientQuery.filters['info.age'] = this.ageFilter;
    }
    return patientQuery;
  }

  fetchFunction = (start, end)  => {
      return SiriusApi.getQueryResults(this.buildPatientQuery(), true, start, end);
  }

  handleFilterChange = (filter, value) => {
    if (filter === 'Indication') {
        if (value.length === 0) {
            this.filters.delete('info.disease_code');
        } else {
            this.filters.set('info.disease_code', { $in : value });
        }
    } else if (filter === 'Gender') {
        if (value.length === 0) {
            this.filters.delete('info.gender');
        } else {
            this.filters.set('info.gender',  { $in : value });
        }
    } else if (filter === 'Vital Status') {
        if (value.length === 0) {
            this.filters.delete('info.vital_status');
        } else {
            this.filters.set('info.vital_status',  { $in : value });
        }
    } else if (filter === 'Age') {
        const range = value;
        this.ageFilter = { '>=': range[0], '<=': range[1] };
    }
    this.setState({
        filterState: JSON.stringify([...this.filters, this.ageFilter])
    });
  }


  renderRow = (patient) => {
    const gender = patient.info.gender.toLowerCase();;
    const age = Math.round(patient.info.age);
    const cancerType = CANCER_NAME_MAP[patient.info.disease_code];
    const vitalStatus = patient.info.vital_status === 'Dead' ? 'Deceased' : patient.info.vital_status;
    const patientDesc = `${gender}, ${age} years old, ${cancerType} (${vitalStatus})`;
    return (<div className='table-row'>
        <div className='table-row-title'>{patient.name} </div>
        <div className='table-row-description'>{patientDesc} </div>
    </div>);
  }

  clickRow = (patient) => {
    const builder = new QueryBuilder();
    builder.newGenomeQuery();
    builder.filterType({'$in': ['SNP', 'variant']});
    builder.filterSource(DATA_SOURCE_TCGA);
    builder.filterPatientBarCode(patient.info.patient_barcode)
    const variantQuery = builder.build();
    App.addVariantTrack(patient.name, variantQuery);
  }

  addAll = () => {
    SiriusApi.getQueryResults(this.buildPatientQuery(), true, 0, 15000).then(data=> {
      const builder = new QueryBuilder();
      builder.newGenomeQuery();
      builder.filterType({'$in': ['SNP', 'variant']});
      builder.filterSource(DATA_SOURCE_TCGA);
      builder.filterPatientBarCode({ $in : data.data.map(d=> d.info.patient_barcode) })
      const variantQuery = builder.build();
      App.addVariantTrack('TCGA variants', variantQuery);
    });
  }

  render() {
    const fetchFunction = this.fetchFunction.bind(this);
    const indicationItems = CANCER_NAMES.map((d) => {
      return { label : d[0], value: d[1] };
    });

    let codes = this.filters.get('info.disease_code') ? this.filters.get('info.disease_code').$in : null;
    if (codes) codes = codes.map(d => {
      return {
        label: CANCER_NAME_MAP[d],
        value: d,
      }
    });

    const genderItems =  GENDER_NAMES.map((d) => {
      return { label : d[0], value: d[1] };
    });

    let genders = this.filters.get('info.gender') ? this.filters.get('info.gender').$in : null;
    if (genders) genders = genders.map(d => {
      return {
        label: GENDER_NAME_MAP[d],
        value: d,
      }
    });

    const statusItems = VITAL_STATUS_NAMES.map((d) => {
      return { label : d[0], value: d[1] };
    });

    let statuses = this.filters.get('info.vital_status') ? this.filters.get('info.vital_status').$in : null;
    if (statuses) statuses = statuses.map(d => {
      return {
        label: VITAL_STATUS_MAP[d],
        value: d,
      }
    });


    return (<div className='tcga-selector'>
        <div className='options'>
          <div class='selector'><Select
            value={codes}
            onChange={(d) => this.handleFilterChange('Indication', Array.isArray(d) ? d.map(x => x.value) : [d.value])}
            options={indicationItems}
            placeholder='Limit by indication'
            isMulti={true}
          />
          </div>{" "}
          <div class='selector'><Select
            value={statuses}
            onChange={(d) => this.handleFilterChange('Vital Status', Array.isArray(d) ? d.map(x => x.value) : [d.value])}
            options={statusItems}
            placeholder='Limit by vital status'
            isMulti={true}
          />
          </div>{" "}
          <div class='selector'><Select
            value={genders}
            onChange={(d) => this.handleFilterChange('Gender', Array.isArray(d) ? d.map(x => x.value) : [d.value])}
            options={genderItems}
            placeholder='Limit by gender'
            isMulti={true}
          />
          </div>{" "}
        </div>
        <TableView fetchId={this.state.filterState} fetch={fetchFunction} rowRenderer={this.renderRow} onClick={this.clickRow}/>
        <RaisedButton
          label="Add All"
          primary={true}
          onClick={() => this.addAll()}
          style={{ position: "absolute", bottom: "10px", marginLeft:"5%", width: "90%" }}
        />
      </div>)
  }
}

TCGASelector.propTypes = {
  appModel: PropTypes.object
};

export default TCGASelector;
