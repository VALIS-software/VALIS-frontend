// Dependencies
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { CHROMOSOME_NAMES, ENTITY_TYPE } from '../../helpers/constants.js';
import {
  Table,
  TableBody,
  TableHeader,
  TableHeaderColumn,
  TableRow,
  TableRowColumn,
} from 'material-ui/Table';
import Paper from 'material-ui/Paper';
import { Card, CardHeader, CardText } from 'material-ui/Card';
import CircularProgress from 'material-ui/CircularProgress';
import DataListItem from '../DataListItem/DataListItem.jsx';
import SNPDetails from '../SNPDetails/SNPDetails.jsx';
import ZoomToButton from '../ZoomToButton/ZoomToButton.jsx';
import Util from '../../helpers/util.js';

// Styles
import './EntityDetails.scss';


class EntityDetails extends Component {
  constructor(props) {
    super(props);
    if (props.appModel) {
      this.appModel = props.appModel;
      this.viewModel = props.viewModel;
      this.api = this.appModel.api;
    }
    this.state = {
      dataID : props.dataID,
    };
    this.loadDetailsData();
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.dataID !== prevState.dataID) {
      return {
        dataID : nextProps.dataID,
      };
    }
    return null;
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.dataID !== this.state.dataID) {
      this.loadDetailsData();
    }
  }

  loadDetailsData() {
    this.api.getDetails(this.state.dataID).then(detailsData => {
      this.setState({
        details: detailsData.details,
        relations: detailsData.relations,
      });
    });
  }

  handleClickRelation(relation) {
    const dataID = relation.id;
    let elem = null;
    if (Util.isType(relation, ENTITY_TYPE.SNP)) {
      elem = (<SNPDetails viewModel={this.viewModel} appModel={this.appModel} snpId={dataID} />);
    } else {
      elem = (<EntityDetails viewModel={this.viewModel} appModel={this.appModel} dataID={dataID} />);
    }
    this.viewModel.pushView(relation.title, dataID, elem);
  }

  render() {
    if (!this.state.details) return (<div className="navigation-controller-loading"><CircularProgress size={80} thickness={5} /> </div>);
    const details = this.state.details;
    const viewModel = this.viewModel;
    // we ignore the relations with 'data not found' for now
    const relations = this.state.relations.filter((r) => { return (r.description !== 'data not found'); });
    return (
      <div className="entity-details">
        <DetailsHeader details={details} viewModel={viewModel} />
        <br />
        <Paper style={{ borderRadius: '10px', overflow: 'hidden' }}>
          <DetailsTable details={details} />
        </Paper>
        <br />
        <Card style={{ borderRadius: '10px', overflow: 'hidden', backgroundColor:'#EEEEEE' }} >
          <CardHeader
            title="More Information"
            actAsExpander={true}
            showExpandableButton={true}
          />
          <CardText expandable={true} style={{ padding: '0px' }} >
            <AdditionInfoTable info={details.info} />
          </CardText>
        </Card>
        <br />
        <RelationsSelector relations={relations} onClick={(relation) => this.handleClickRelation(relation)} />
      </div>
    );
  }
}

EntityDetails.propTypes = {
  dataID: PropTypes.string,
  appModel: PropTypes.object,
  viewModel: PropTypes.object,
};

function DetailsHeader(props) {
  if (!props.details) return (<div />);
  const details = props.details;
  const name = details.name;
  let description = '';
  if (details.info.description) {
    description = unescape(details.info.description);
  }
  
  let zoomBtn = (<div />);

  if (details.contig) {
    const absoluteStart = Util.chromosomeRelativeToUniversalBasePair(details.contig, details.start);
    const absoluteEnd = Util.chromosomeRelativeToUniversalBasePair(details.contig, details.end);
    zoomBtn = (<ZoomToButton viewModel={props.viewModel} start={absoluteStart} end={absoluteEnd} padding={0.2} />);    
  }

  return (
    <div className="entity-header">
      <div className="entity-name">{name}{zoomBtn}</div>
      <div className="entity-desc">{description}</div>
    </div>
  );
}

DetailsHeader.propTypes = {
  details: PropTypes.object,
  viewModel: PropTypes.object,
};

function DetailsTable(props) {
  if (!props.details) return (<div />);
  const details = props.details;
  const detailItems = [];
  // show available data
  const viewKeys = ['type', 'contig', 'start', 'end', 'length', 'source'];
  for (const k of viewKeys) {
    if (details[k]) {
      const valueStr = details[k].toString();
      detailItems.push(
        <TableRow style={{ backgroundColor: '#FAFAFA' }} key={k}>
          <TableRowColumn> {k} </TableRowColumn>
          <TableRowColumn> {valueStr} </TableRowColumn>
        </TableRow>
      );
    }
  }
  return (
    <Table selectable={false}>
      <TableBody displayRowCheckbox={false} showRowHover={true}>
        {detailItems}
      </TableBody>
    </Table>
  );
}

DetailsTable.propTypes = {
  details: PropTypes.object,
};

function AdditionInfoTable(props) {
  if (!props.info) return (<div />);
  const info = props.info;
  const infoItems = [];
  for (const k of Object.keys(info)) {
    const valueStr = info[k].toString();
    infoItems.push(
        <TableRow style={{ backgroundColor: '#EEEEEE' }} key={k}>
          <TableRowColumn> {k} </TableRowColumn>
          <TableRowColumn> {valueStr} </TableRowColumn>
        </TableRow>
    );
  }
  return (
    <Table selectable={false}>
      <TableBody displayRowCheckbox={false} showRowHover={true}>
        {infoItems}
      </TableBody>
    </Table>
  );
}

AdditionInfoTable.propTypes = {
  info: PropTypes.object,
};

function RelationsSelector(props) {
  if (!props.relations) return (<div />);
  const relationButtons = [];
  for (const relation of props.relations) {
    relationButtons.push(<DataListItem
      title={relation.title}
      description={relation.description}
      onClick={() => props.onClick(relation)}
      key={relation.id}
    />);
  }
  return (<div className="relation-selector">{ relationButtons }</div>);
}

RelationsSelector.propTypes = {
  relations: PropTypes.array,
  onClick: PropTypes.func,
};

export default EntityDetails;
