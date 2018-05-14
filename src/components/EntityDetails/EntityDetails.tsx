// Dependencies
import * as React from "react";
import * as PropTypes from "prop-types";
import { ENTITY_TYPE } from "../../helpers/constants.js";
import {
    Table,
    TableBody,
    TableRow,
    TableRowColumn,
} from "material-ui/Table";
import Paper from "material-ui/Paper";
import { Card, CardHeader, CardText } from "material-ui/Card";
import CircularProgress from "material-ui/CircularProgress";
import DataListItem from "../DataListItem/DataListItem.jsx";
import SNPDetails from "../SNPDetails/SNPDetails.jsx";
import GWASDetails from "../GWASDetails/GWASDetails.jsx";
import ZoomToButton from "../ZoomToButton/ZoomToButton.jsx";
import Util from "../../helpers/util.js";

// Styles
import "./EntityDetails.scss";

class EntityDetails extends React.Component<any, any> {

    static propTypes = {
        dataID: PropTypes.string,
        appModel: PropTypes.object,
        viewModel: PropTypes.object
    };

    static getDerivedStateFromProps(nextProps: any, prevState: any) {
        if (nextProps.dataID !== prevState.dataID) {
            return {
                dataID: nextProps.dataID
            };
        }
        return null;
    }

    private appModel: any;
    private viewModel: any;
    private api: any;

    constructor(props: any) {
        super(props);
        if (props.appModel) {
            this.appModel = props.appModel;
            this.viewModel = props.viewModel;
            this.api = this.appModel.api;
        }
        this.state = {
            dataID: props.dataID
        };
        this.loadDetailsData();
    }

    componentDidUpdate(prevProps: any, prevState: any) {
        if (prevState.dataID !== this.state.dataID) {
            this.loadDetailsData();
        }
    }

    loadDetailsData() {
        this.api.getDetails(this.state.dataID).then((detailsData: any) => {
            this.setState({
                details: detailsData.details,
                relations: detailsData.relations
            });
        });
    }

    handleClickRelation(relation: any) {
        const dataID = relation.id;
        let elem = null;
        if (Util.isType(relation, ENTITY_TYPE.SNP)) {
            elem = (<SNPDetails viewModel={this.viewModel} appModel={this.appModel} snpId={dataID} />);
        } else if (relation.title === 'GWAS Association') { // TODO: we need to provide better data to determine relation types
            elem = (<GWASDetails viewModel={this.viewModel} appModel={this.appModel} assocId={dataID} />);
        } else {
            elem = (<EntityDetails viewModel={this.viewModel} appModel={this.appModel} dataID={dataID} />);
        }
        this.viewModel.pushView(relation.title, dataID, elem);
    }

    render() {
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
                <br />
                <Paper style={{ borderRadius: "10px", overflow: "hidden" }}>
                    <DetailsTable details={details} />
                </Paper>
                <br />
                <Card
                    style={{
                        borderRadius: "10px",
                        overflow: "hidden",
                        backgroundColor: "#EEEEEE"
                    }}
                >
                    <CardHeader
                        title="More Information"
                        actAsExpander={true}
                        showExpandableButton={true}
                    />
                    <CardText expandable={true} style={{ padding: "0px" }}>
                        <AdditionInfoTable info={details.info} />
                    </CardText>
                </Card>
                <br />
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
        const absoluteStart = Util.chromosomeRelativeToUniversalBasePair(details.contig, details.start);
        const absoluteEnd = Util.chromosomeRelativeToUniversalBasePair(details.contig, details.end);
        zoomBtn = (<ZoomToButton viewModel={props.viewModel} start={absoluteStart} end={absoluteEnd} padding={0.2} />);
    }

    return (
        <div className="entity-header">
            <div className="entity-name">
                {name}
                {zoomBtn}
            </div>
            <div className="entity-desc">{description}</div>
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
                <TableRow style={{ backgroundColor: "#FAFAFA" }} key={k}>
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
            <TableRow style={{ backgroundColor: "#EEEEEE" }} key={k}>
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

export default EntityDetails;
