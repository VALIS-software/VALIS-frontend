import { Strand } from "../gff3/Strand";
import { Feature } from "../gff3/Feature";

export enum GenomeFeatureType {
	// order corresponds to nesting depth
	Gene,
	Transcript,
	TranscriptComponent,
}

export interface GenomeFeatureTypeMap {
	[GenomeFeatureType.Gene]: GeneInfo,
	[GenomeFeatureType.Transcript]: TranscriptInfo,
	[GenomeFeatureType.TranscriptComponent]: TranscriptComponentInfo,
}

export type GenomeFeature<E extends keyof GenomeFeatureTypeMap> = GenomeFeatureTypeMap[E] & {
	type: E,
}

export type TileContent = Array<GenomeFeature<keyof GenomeFeatureTypeMap>>;

export enum GeneClass {
	// this is a small, simplified subset of types specified in the Sequence Ontology
	Unspecified,
	ProteinCoding, // assumed default
	NonProteinCoding, // aka regulatory
	Pseudo, // non-functional imperfect copy
}

export type GeneInfo = {
	name?: string,
	startIndex: number,
	length: number,
	strand: Strand,
	class: GeneClass,
	soClass: keyof SoGeneClass,
}

export enum TranscriptClass {
	Unspecified,
	// aka protein coding RNA
	Messenger,
	// non-protein coding
	NonProteinCoding,
		// sub-types include
		// Ribosomal
		// Transfer
		// Small nuclear
		// Small nucleolar
}

/**
 * Mature transcript – transcript after processing
 */
export type TranscriptInfo = {
	name?: string,
	startIndex: number,
	length: number,
	class: TranscriptClass,
	soClass: keyof SoTranscriptClass,
}

export enum TranscriptComponentClass {
	Exon,
	Untranslated,
	ProteinCodingSequence,
}

export type TranscriptComponentInfo = {
	name?: string,
	startIndex: number,
	length: number,
	class: TranscriptComponentClass,
	soClass: keyof SoTranscriptComponentClass,
	phase?: number, // see https://github.com/The-Sequence-Ontology/Specifications/blob/master/gff3.md#description-of-the-format
}

// small sub set of SO terms found in the Ensemble gff3 files
// for a more complete set, we should use data from https://github.com/The-Sequence-Ontology/SO-Ontologies
export class SoGeneClass {
	[key: string]: undefined | GeneClass;

	readonly 'gene' = GeneClass.Unspecified;
	readonly 'ncRNA_gene' = GeneClass.NonProteinCoding;
	readonly 'pseudogene' = GeneClass.Pseudo;

	static readonly instance = new SoGeneClass();
}

export class SoTranscriptClass {
	[key: string]: undefined | TranscriptClass;

	readonly 'lnc_RNA' = TranscriptClass.NonProteinCoding;
	readonly 'mRNA' = TranscriptClass.Messenger;
	readonly 'pseudogenic_transcript' = TranscriptClass.Unspecified;
	readonly 'transcript' = TranscriptClass.Unspecified;
	readonly 'miRNA' = TranscriptClass.NonProteinCoding;
	readonly 'ncRNA' = TranscriptClass.NonProteinCoding;
	readonly 'rRNA' = TranscriptClass.NonProteinCoding;
	readonly 'scRNA' = TranscriptClass.NonProteinCoding;
	readonly 'snoRNA' = TranscriptClass.NonProteinCoding;
	readonly 'snRNA' = TranscriptClass.NonProteinCoding;

	static readonly instance = new SoTranscriptClass();
}

export class SoTranscriptComponentClass {
	[key: string]: undefined | TranscriptComponentClass;

	readonly 'CDS' = TranscriptComponentClass.ProteinCodingSequence;
	readonly 'exon' = TranscriptComponentClass.Exon;
	readonly 'five_prime_UTR' = TranscriptComponentClass.Untranslated;
	readonly 'three_prime_UTR' = TranscriptComponentClass.Untranslated;

	static readonly instance = new SoTranscriptComponentClass();
}

type Tile = {
	startIndex: number,
	span: number,
	content: TileContent
}

export class AnnotationTileset {

	readonly tiles = new Array<Tile>();

	constructor(
		protected tileSize: number,
		protected onUnknownFeature: (feature: Feature) => void,
		protected onError: (reason: string) => void,
	) {}

	addTopLevelFeature = (feature: Feature) => {
		// tiles are determined at the top level
		let i0 = Math.floor(feature.start / this.tileSize);
		let i1 = Math.floor(feature.end / this.tileSize);
		for (let i = i0; i <= i1; i++) {
			let tile = this.getTile(i);
			this.addFeature(tile, feature);
		}
	}

	protected addFeature(tile: Tile, feature: Feature) {
		let featureCommon = {
			name: feature.name,
			startIndex: feature.start - 1,
			length: feature.end - feature.start + 1,
			soClass: feature.type,
		}

		if (SoGeneClass.instance[feature.type] !== undefined) {
			// is gene
			tile.content.push({
				...featureCommon,
				type: GenomeFeatureType.Gene,
				class: SoGeneClass.instance[feature.type] as any,
				strand: feature.strand,
			});
		} else if (SoTranscriptClass.instance[feature.type] !== undefined) {
			// is transcript
			tile.content.push({
				...featureCommon,
				type: GenomeFeatureType.Transcript,
				class: SoTranscriptClass.instance[feature.type] as any,
			});
		} else if (SoTranscriptComponentClass.instance[feature.type] !== undefined) {
			// is transcript component
			let info: GenomeFeature<GenomeFeatureType.TranscriptComponent> = {
				...featureCommon,
				type: GenomeFeatureType.TranscriptComponent,
				class: SoTranscriptComponentClass.instance[feature.type] as any,
			};
			if (feature.phase != null) {
				info.phase = feature.phase;
			}
			tile.content.push(info);
		} else {
			this.onUnknownFeature(feature);
			return;
		}

		for (let child of feature.children) {
			this.addFeature(tile, child);
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