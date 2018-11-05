import { VariantTrack } from "genome-visualizer";
import { EntityType } from "valis";
import { App } from "../../App";

export class VariantTrackOverride extends VariantTrack {

    protected onVariantClicked = (e: any, variantId: string) => {
        const userFileID = this.model.query ? this.model.query.userFileID : null;
        const entity = { id: variantId, type: EntityType.SNP, userFileID: userFileID };
        App.displayEntityDetails(entity);
    }

}