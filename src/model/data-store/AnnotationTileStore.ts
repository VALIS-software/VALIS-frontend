import { TileContent, GeneInfo, TranscriptInfo, TranscriptComponentInfo, GenomeFeatureType } from "../../../lib/sirius/AnnotationTileset";
import SiriusApi from "../../../lib/sirius/SiriusApi";
import { Tile, TileStore } from "./TileStore";

// Tile payload is a list of genes extended with nesting
export type Gene = GeneInfo & {
    transcripts: Array<Transcript>;
};

export type Transcript = TranscriptInfo & {
    components: Array<TranscriptComponentInfo>
}

export type TilePayload = Array<Gene>

export class AnnotationTileStore extends TileStore<TilePayload, void> {

    constructor(sourceId: string) {
        super(1 << 20, 1);
    }

    protected mapLodLevel(l: number) {
        return Math.floor(l / 8) * 8;
    }

    protected getTilePayload(tile: Tile<TilePayload>): Promise<TilePayload> | TilePayload {
        if (tile.lodLevel > 0) {
            console.log('returning empty payload', tile.lodLevel);
            return [];
        }

        console.log('Request annotations for ', tile.lodX, tile.lodSpan);
        return SiriusApi.loadAnnotations('chromosome1', tile.lodX, tile.lodSpan).then((flatFeatures) => {
            // convert flat list of features into a nested structure which is easier to work with for rendering
            let payload: TilePayload = new Array();
            let activeGene: TilePayload[0];
            let activeTranscript: TilePayload[0]['transcripts'][0];
            let lastType: number = -1;

            for (let i = 0; i < flatFeatures.length; i++) {
                let feature = flatFeatures[i];

                // validate feature type conforms to expected nesting order
                let deltaType = feature.type - lastType;
                if (deltaType > 1) {
                    console.warn(`Invalid gene feature nesting: ${GenomeFeatureType[lastType]} -> ${GenomeFeatureType[feature.type] }`);
                }
                lastType = feature.type;

                if (feature.type === GenomeFeatureType.Gene) {
                    let geneInfo = feature as GeneInfo;
                    activeGene = {
                        ...geneInfo,
                        transcripts: [],
                    };
                    payload.push(activeGene);
                }

                if (feature.type === GenomeFeatureType.Transcript) {
                    let transcriptInfo = feature as TranscriptInfo;
                    if (activeGene == null) {
                        console.warn(`Out of order Transcript - no parent gene found`);
                        continue;
                    }
                    activeTranscript = {
                        ...transcriptInfo,
                        components: [],
                    };
                    activeGene.transcripts.push(activeTranscript);
                }

                if (feature.type === GenomeFeatureType.TranscriptComponent) {
                    let componentInfo = feature as TranscriptComponentInfo;
                    if (activeTranscript == null) {
                        console.warn(`Out of order TranscriptComponent - no parent transcript found`);
                        continue;
                    }
                    activeTranscript.components.push(componentInfo);
                }
            }

            return payload;
        });
    }

}

export default AnnotationTileStore;