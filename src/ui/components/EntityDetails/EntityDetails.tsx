import EntityType from "sirius/EntityType";
import AppModel from "../../models/AppModel";
import ViewModel from "../../models/ViewModel";
import GeneDetails from "../GeneDetails/GeneDetails";
import GenericEntityDetails from "../GenericEntityDetails/GenericEntityDetails";
import GWASDetails from "../GWASDetails/GWASDetails";
import SNPDetails from "../SNPDetails/SNPDetails";
import TraitDetails from "../TraitDetails/TraitDetails";

import React = require("react");

export function EntityDetails(props: {
    entity: { id: string, type: EntityType},
    appModel: AppModel,
    viewModel: ViewModel
}) {
    const dataID: string = props.entity.id;
    const entityType: string = props.entity.type;
    let elem = null;
    if (entityType === EntityType.SNP) {
        elem = (<SNPDetails viewModel={props.viewModel} appModel={props.appModel} snpId={dataID} />);
    } else if (entityType === EntityType.GENE) {
        elem = (<GeneDetails viewModel={props.viewModel} appModel={props.appModel} geneId={dataID} />);
    } else if (entityType === EntityType.TRAIT) {
        elem = (<TraitDetails viewModel={props.viewModel} appModel={props.appModel} traitId={dataID} />);
    } else if (entityType === EntityType.GWAS) {
        elem = (<GWASDetails viewModel={props.viewModel} appModel={props.appModel} assocId={dataID} />);
    } else {
        elem = (<GenericEntityDetails viewModel={props.viewModel} appModel={props.appModel} dataID={dataID} />);
    }
    return elem;
}