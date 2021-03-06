// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import {
	Table,
	TableBody,
	TableRow,
	TableRowColumn,
} from "material-ui/Table";
import Paper from "material-ui/Paper";

import CircularProgress from "material-ui/CircularProgress";
import DataListItem from "../DataListItem/DataListItem";
import ZoomToButton from "../Shared/ZoomToButton/ZoomToButton";

import ErrorDetails from "../Shared/ErrorDetails/ErrorDetails";
import { SiriusApi } from 'valis';
import App from "../../../App";

// Styles
import "./GenericEntityDetails.scss";

const prettyPrint = (str: string) => {
	return str.split(",").join(" ");
}
class GenericEntityDetails extends React.Component<any, any> {

	static propTypes = {
		entity: PropTypes.object,
		appModel: PropTypes.object,
		viewModel: PropTypes.object
	};

	private appModel: any;
	private viewModel: any;

	constructor(props: any) {
		super(props);
		if (props.appModel) {
			this.appModel = props.appModel;
			this.viewModel = props.viewModel;
		}
		this.state = {};
	}

	componentDidMount() {
		const entity = this.props.entity;
		this.fetchData(entity.id, entity.userFileID);
	}

	componentDidUpdate(prevProps: any) {
		const entity = this.props.entity;
		if (entity.id !== prevProps.entity.id || entity.userFileID !== prevProps.entity.userFileID) {
			this.fetchData(entity.id, entity.userFileID);
		}
	}

	fetchData(dataID: string, userFileID?: string) {
		SiriusApi.getDetails(dataID, userFileID).then((detailsData: any) => {
			this.setState({
				details: detailsData.details,
				relations: detailsData.relations,
			});
		}, (err: object) => {
			this.appModel.error(this, err);
			this.setState({
				error: err,
			});
		});
	}

	handleClickRelation(relation: any) {
		App.displayEntityDetails(relation);
	}

	render() {
		if (this.state.error) {
			return (<ErrorDetails error={this.state.error} />);
		}
		if (!this.state.details) {
			return (
				<div className="navigation-controller-loading">
					<CircularProgress size={80} thickness={5} />{" "}
				</div>
			);
		}
		const details = this.state.details;
		const viewModel = this.viewModel;
		// we ignore the relations with 'data not found' for now
		const relations = this.state.relations.filter((r: any) => {
			return r.description !== "data not found";
		});
		return (
			<div className="entity-details">
				<DetailsHeader details={details} viewModel={viewModel} />
				<Paper>
					<DetailsTable details={details} />
				</Paper>
				<AdditionInfoTable info={details.info} />
				<RelationsSelector
					relations={relations}
					onClick={(relation: any) => this.handleClickRelation(relation)}
				/>
			</div>
		);
	}
}

function DetailsHeader(props: any) {
	if (!props.details) {
		return <div />;
	}
	const details = props.details;
	const name = details.name;
	let description = "";
	if (details.info.description) {
		description = unescape(details.info.description);
	}

	let zoomBtn = <div />;

	if (details.contig) {
		zoomBtn = (<ZoomToButton contig={details.contig} start={details.start} end={details.end} padding={0.2} />);
	}

	return (
		<div className="sidebar-header">
			<div className="sidebar-name">
				{name}
				{zoomBtn}
			</div>
			<div className="sidebar-description">{description}</div>
		</div>
	);
}

(DetailsHeader as any).propTypes = {
	details: PropTypes.object,
	viewModel: PropTypes.object
};

function DetailsTable(props: any) {
	if (!props.details) {
		return <div />;
	}

	const details = props.details;
	const detailItems = [];
	// show available data
	const viewKeys = ['type', 'contig', 'start', 'end', 'length', 'source'];
	for (const k of viewKeys) {
		if (details[k]) {
			const valueStr = details[k].toString();
			detailItems.push(
				<TableRow key={k}>
					<TableRowColumn> {k} </TableRowColumn>
					<TableRowColumn style={{ whiteSpace: 'normal' }}> {prettyPrint(valueStr)} </TableRowColumn>
				</TableRow>
			);
		}
	}
	return (
		<Table selectable={false}>
			<TableBody displayRowCheckbox={false} showRowHover={false}>
				{detailItems}
			</TableBody>
		</Table>
	);
}

(DetailsTable as any).propTypes = {
	details: PropTypes.object
};

function AdditionInfoTable(props: any) {
	if (!props.info) {
		return <div />;
	}
	const info = props.info;
	const infoItems = [];
	for (const k of Object.keys(info)) {
		const valueStr = info[k].toString();
		infoItems.push(
			<TableRow key={k}>
				<TableRowColumn> {k} </TableRowColumn>
				<TableRowColumn style={{ whiteSpace: 'normal' }}> {prettyPrint(valueStr)} </TableRowColumn>
			</TableRow>
		);
	}
	return (
		<Table selectable={false}>
			<TableBody displayRowCheckbox={false} showRowHover={false}>
				{infoItems}
			</TableBody>
		</Table>
	);
}

(AdditionInfoTable as any).propTypes = {
	info: PropTypes.object
};

function RelationsSelector(props: any) {
	if (!props.relations) {
		return <div />;
	}
	const relationButtons = [];
	for (const relation of props.relations) {
		relationButtons.push(
			<DataListItem
				title={relation.title}
				description={relation.description}
				onClick={() => props.onClick(relation)}
				key={relation.id}
			/>
		);
	}
	return <div className="relation-selector">{relationButtons}</div>;
}

(RelationsSelector as any).propTypes = {
	relations: PropTypes.array,
	onClick: PropTypes.func
};

export default GenericEntityDetails;
