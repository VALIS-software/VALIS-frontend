import { IDataSource, Contig, GenomeFeature } from "genome-visualizer";
import { SiriusApi } from "valis";

export class SiriusDataSource implements IDataSource {

    protected contigsPromise: Promise<Array<Contig>>;

    constructor(protected readonly siriusApi: typeof SiriusApi) {
        this.contigsPromise = new Promise((resolve, reject) => {
            return this.siriusApi.getContigs().then((contigMap) => {
                let contigIds = Object.keys(contigMap);

                // use a natural string sort
                contigIds = contigIds.sort((a, b) => {
                    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
                });

                let contigArray = new Array<Contig>();

                for (let contigId of contigIds) {
                    contigArray.push({
                        id: contigId,
                        name: this.formatContigId(contigId),
                        startIndex: contigMap[contigId].start - 1,
                        span: contigMap[contigId].length,
                    });
                }
                
                resolve(contigArray);
            }).catch(reject);
        });
    }

    getContigs(): Promise<Array<Contig>> {
        return this.contigsPromise;
    }

    loadACGTSequence(
        contig: string,
        startBaseIndex: number,
        span: number,
        lodLevel: number,
    ): Promise<{
        array: Uint8Array,
        sequenceMinMax: {
            min: number,
            max: number,
        },
        indicesPerBase: number,
    }> {
        return SiriusApi.loadACGTSequence(contig, startBaseIndex, span, lodLevel);
    };

    loadAnnotations(
        contig: string,
        startBaseIndex: number,
        span: number,
        macro: boolean,
    ): Promise<Array<GenomeFeature>> {
        return SiriusApi.loadAnnotations(contig, startBaseIndex, span, macro);
    }

    protected formatContigId(contigId: string) {
        // contigs of the format 'chr**' become 'Chromosome **'
        let chromosomeContigMatch = /^chr(\w+)$/.exec(contigId);
        if (chromosomeContigMatch) {
            return `Chromosome ${chromosomeContigMatch[1]}`;
        } else {
            return contigId;
        }
    }

}