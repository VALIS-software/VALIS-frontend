import Strand from "genomics-formats/dist/gff3/Strand";

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
    transcriptCount: number,
}

export enum TranscriptClass {
    Unspecified,
    // aka protein coding RNA
    ProteinCoding,
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
    readonly 'mRNA' = TranscriptClass.ProteinCoding;
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