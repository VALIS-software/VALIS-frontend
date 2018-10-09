import { AnnotationTrack, Gene, GenomeFeature } from 'genome-browser';
import App from '..//App';
import { QueryBuilder, SiriusApi } from 'valis';

export class AnnotationTrackOverride extends AnnotationTrack {

    protected onAnnotationClicked = (e: any, feature: GenomeFeature, gene: Gene) => {
        if (gene.name == null) {
            console.warn(`Cannot search for a gene with no name`, gene);
            return;
        }

        // we want to directly open the details view of the entity here
        // @to-do After we switch to use the /reference API
        // 1. Directly use id of the entity data (no query needed), similar to VariantTrack
        // 2. Open gene details when clicking on gene, transcript details when clicking transcript, exon details when clicking exon
        const builder = new QueryBuilder();
        builder.newGenomeQuery();
        builder.filterName(gene.name.toUpperCase());
        builder.setLimit(1);
        const geneQuery = builder.build();
        SiriusApi.getQueryResults(geneQuery, false).then(results => {
            if (results.data.length > 0) {
                const entity = results.data[0];
                App.displayEntityDetails(entity);
            } else {
                // this is a temporary solution
                alert("Data not found");
            }
        });
    }

}