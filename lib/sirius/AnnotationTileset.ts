import { Strand } from '../gff3/Gff3LineParser';
import { Feature } from '../gff3/Gff3Parser';

export type Tile = {
	startIndex: number,
	span: number,
	content: Array<Gene>
}

export enum GeneType {
	// this is a small, simplified subset of types specified in the Sequence Ontology
	Unspecified,
	ProteinCoding, // assumed default
	NonProteinCoding, // aka regulatory
	Pseudo, // non-functional imperfect copy
}

export type Gene = { 
	startIndex: number,
	endIndex: number,
	type: GeneType,
	soClassification: keyof SoGeneTypes,
	transcripts: Array<Transcript>
}

export enum TranscriptType {
	Unspecified,
	// aka protein coding RNA
	Messenger,
	// non-protein coding
	NonProteinCoding,
		// sub types include
		// Ribosomal
		// Transfer
		// Small nuclear
		// Small nucleolar
}

/**
 * Mature transcript – transcript after processing
 */
export type Transcript = {
	startIndex: number,
	endIndex: number,
	type: TranscriptType,
	soClassification: keyof SoTranscriptTypes,
	strand: Strand,
	components: Array<TranscriptComponent>,
}

export enum TranscriptComponentType {
	Exon,
	Untranslated,
	ProteinCodingSequence,
}

export type TranscriptComponent = {
	startIndex: number,
	endIndex: number,
	type: TranscriptComponentType,
	soClassification: keyof SoTranscriptComponentTypes,
	phase?: number, // see https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md#description-of-the-format
}

// small sub set of SO terms found in the Ensemble gff3 files
// for a more complete set, we should use data from https://github.com/The-Sequence-Ontology/SO-Ontologies
export class SoGeneTypes {
	[key: string]: undefined | GeneType;

	readonly 'gene' = GeneType.Unspecified;
	readonly 'ncRNA_gene' = GeneType.NonProteinCoding;
	readonly 'pseudogene' = GeneType.Pseudo;

	static readonly instance = new SoGeneTypes();
}

export class SoTranscriptTypes {
	[key: string]: undefined | TranscriptType;

	readonly 'lnc_RNA' = TranscriptType.NonProteinCoding;
	readonly 'mRNA' = TranscriptType.Messenger;
	readonly 'pseudogenic_transcript' = TranscriptType.Unspecified;
	readonly 'transcript' = TranscriptType.Unspecified;
	readonly 'miRNA' = TranscriptType.NonProteinCoding;
	readonly 'ncRNA' = TranscriptType.NonProteinCoding;
	readonly 'rRNA' = TranscriptType.NonProteinCoding;
	readonly 'scRNA' = TranscriptType.NonProteinCoding;
	readonly 'snoRNA' = TranscriptType.NonProteinCoding;
	readonly 'snRNA' = TranscriptType.NonProteinCoding;

	static readonly instance = new SoTranscriptTypes();
}

export class SoTranscriptComponentTypes {
	[key: string]: undefined | TranscriptComponentType;

	readonly 'CDS' = TranscriptComponentType.ProteinCodingSequence;
	readonly 'exon' = TranscriptComponentType.Exon;
	readonly 'five_prime_UTR' = TranscriptComponentType.Untranslated;
	readonly 'three_prime_UTR' = TranscriptComponentType.Untranslated;

	static readonly instance = new SoTranscriptComponentTypes();
}

export class AnnotationTileset {

	readonly tiles = new Array<Tile>();

	constructor(
		protected tileSize: number,
		protected onUnknownFeature: (feature: Feature) => void,
		protected onError: (reason: string) => void,
	) {}

	addTopLevelFeature = (feature: Feature) => {
		if (!this.isGene(feature)) {
			this.onUnknownFeature(feature);
			return;
		}

		let gene = this.featureToGene(feature);

		if (gene == null) {
			this.onError('Gene unexpected null');
			return;
		}

		let i0 = Math.floor(feature.start / this.tileSize);
		let i1 = Math.floor(feature.end / this.tileSize);
		for (let i = i0; i <= i1; i++) {
			let tile = this.getTile(i);

			tile.content.push(gene);
		}
	}

	protected isGene(feature: Feature) {
		return SoGeneTypes.instance[feature.type] !== undefined;
	}

	protected isTranscript(feature: Feature) {
		return SoTranscriptTypes.instance[feature.type] !== undefined;
	}

	protected isTranscriptComponent(feature: Feature) {
		return SoTranscriptComponentTypes.instance[feature.type] !== undefined;
	}

	protected featureToGene(feature: Feature): Gene | null {
		let geneType = SoGeneTypes.instance[feature.type];

		if (geneType !== undefined) {
			let transcripts = feature.children
				.filter(this.isTranscript)
				.map((c) => this.featureToTranscript(c) as Transcript);

			return {
				startIndex: feature.start - 1,
				endIndex: feature.end - 1,
				type: geneType,
				soClassification: feature.type,
				transcripts: transcripts,
			};
		} else {
			return null;
		}
	}

	protected featureToTranscript(feature: Feature): Transcript | null {
		let transcriptType = SoTranscriptTypes.instance[feature.type];

		if (transcriptType !== undefined) {
			let components = feature.children
				.filter(this.isTranscriptComponent)
				.map((c) => this.featureToTranscriptComponent(c) as TranscriptComponent);

			return {
				startIndex: feature.start - 1,
				endIndex: feature.end - 1,
				type: transcriptType,
				soClassification: feature.type,
				components: components,
				strand: feature.strand,
			}
		} else {
			return null;
		}
	}

	protected featureToTranscriptComponent(feature: Feature): TranscriptComponent | null {
		let componentType = SoTranscriptComponentTypes.instance[feature.type];

		if (componentType !== undefined) {
			let component: TranscriptComponent = {
				startIndex: feature.start - 1,
				endIndex: feature.end - 1,
				type: componentType,
				soClassification: feature.type,
			}
			if (feature.phase != null) {
				component.phase = feature.phase; // see https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md#description-of-the-format
			}
			return component;
		} else {
			return null;
		}
	}

	protected getTile(index: number) {
		if (this.tiles[index] == null) {
			// create intervening tiles
			for (let i = 0; i <= index; i++) {
				if (this.tiles[i] == null) {
					this.tiles[i] = {
						startIndex: i * this.tileSize,
						span: this.tileSize,
						content: []
					}
				}
			}
		}

		return this.tiles[index];
	}

}

export default AnnotationTileset;