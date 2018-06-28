const LOCAL_API_URL = 'http://127.0.0.1:5000';

const COLOR1 = [37, 206, 209];
const COLOR2 = [128, 155, 206];
const COLOR3 = [255, 138, 91];
const COLOR4 = [232, 82, 111];
const COLOR5 = [250, 192, 94];
const COLOR6 = [89, 205, 144];
const COLOR7 = [25, 147, 251];
const COLOR8 = [209, 17, 73];
const SIGNAL_COLORS = [COLOR1, COLOR2, COLOR3, COLOR4];
const BASE_PAIR_COLORS = [COLOR5, COLOR6, COLOR7, COLOR8];
const MAX_BASE_PAIR_WIDTH = 32.0;
const TRACK_DATA_TYPE_BASE_PAIRS = 'basepairs';
const TRACK_DATA_TYPE_GBANDS = 'gbands';
const TRACK_DATA_TYPE_SIGNAL = 'signal';

// These const strings should be consistent with backend sirius.realdata.constants
const DATA_SOURCE_GENOME = 'GRCh38_gff';
const DATA_SOURCE_GWAS = 'GWAS';
const DATA_SOURCE_EXSNP = 'exSNP';
const DATA_SOURCE_CLINVAR = 'ClinVar';
const DATA_SOURCE_DBSNP = 'dbSNP';
const DATA_SOURCE_ENCODE = 'ENCODE';
const DATA_SOURCE_FASTA = 'RefSeq';
const DATA_SOURCE_EFO = 'EFO';
const DATA_SOURCE_ENCODEbigwig = 'ENCODEbigwig';
const DATA_SOURCE_ExAC = 'ExAC';
const DATA_SOURCE_TCGA = 'TCGA';
const DATA_SOURCE_ENSEMBL = 'ENSEMBL';
const DATA_SOURCE_GTEX = 'GTEx';

const TRACK_TYPE_SEQUENCE = 'track_type_sequence';
const TRACK_TYPE_FUNCTIONAL = 'track_type_functional';
const TRACK_TYPE_GENOME = 'track_type_genome';
const TRACK_TYPE_GWAS = 'track_type_gwas';
const TRACK_TYPE_EQTL = 'track_type_eqtl';
const TRACK_TYPE_ENCODE = 'track_type_encode';
const TRACK_TYPE_3D = 'track_type_3d';
const TRACK_TYPE_NETWORK = 'track_type_network';
const TRACK_TYPE_BOOLEAN = 'track_type_boolean';

const ENTITY_TYPE = {
  SNP: 'SNP',
  GENE: 'gene',
  TRAIT: 'trait',
  GWAS: 'association:SNP:trait',
  EQTL: 'association:SNP:gene',
};

const CHROMOSOME_SIZES = [
  248956422,
  242193529,
  198295559,
  190214555,
  181538259,
  170805979,
  159345973,
  145138636,
  138394717,
  133797422,
  135086622,
  133275309,
  114364328,
  107043718,
  101991189,
  90338345,
  83257441,
  80373285,
  58617616,
  64444167,
  46709983,
  50818468,
  156040895,
  57227415,
];

const CHROMOSOME_START_BASE_PAIRS = [0];
for (let i = 0; i < CHROMOSOME_SIZES.length; i++) {
  const currSize = CHROMOSOME_START_BASE_PAIRS[i] + CHROMOSOME_SIZES[i];
  CHROMOSOME_START_BASE_PAIRS.push(currSize);
}

const GENOME_LENGTH = CHROMOSOME_START_BASE_PAIRS[CHROMOSOME_START_BASE_PAIRS.length - 1];

const CHROMOSOME_NAMES = [];
for (let i = 1; i < 23; i++) {
  CHROMOSOME_NAMES.push(`chr${i}`);
}

CHROMOSOME_NAMES.push('chrX');
CHROMOSOME_NAMES.push('chrY');

const VARIANT_TAGS = ['is_common', 'missense_variant', 'regulatory_region_variant', 'upstream_gene_variant', 'synonymous_variant', 'TF_binding_site_variant', 'intron_variant', 'non_coding_transcript_exon_variant', 'non_coding_transcript_variant', 'downstream_gene_variant', 'splice_region_variant', 'frameshift_variant', 'loss_of_function', 'splice_acceptor_variant', 'splice_donor_variant', 'stop_gained', '5_prime_UTR_variant', 'NMD_transcript_variant', '3_prime_UTR_variant', 'coding_sequence_variant', 'inframe_deletion', 'inframe_insertion', 'stop_lost', 'start_lost', 'incomplete_terminal_codon_variant', 'stop_retained_variant', 'intergenic_variant', 'protein_altering_variant', 'mature_miRNA_variant', 'TFBS_ablation', 'transcript_ablation'];
const DATA_SOURCES = [
  DATA_SOURCE_GENOME,
  DATA_SOURCE_GWAS,
  DATA_SOURCE_EXSNP,
  DATA_SOURCE_CLINVAR,
  DATA_SOURCE_DBSNP,
  DATA_SOURCE_ENCODE,
  DATA_SOURCE_FASTA,
  DATA_SOURCE_EFO,
  DATA_SOURCE_ENCODEbigwig,
  DATA_SOURCE_ExAC,
  DATA_SOURCE_TCGA,
  DATA_SOURCE_ENSEMBL,
  DATA_SOURCE_GTEX
];

const FILTER_TYPES = {
  DATASET: 'dataset',
  TYPE: 'type',
  VARIANT_TAG: 'variant_tag',
  ALLELE_FREQUENCY: 'allele_frequency',
  P_VALUE: 'p_value',
};

export {
  GENOME_LENGTH,
  LOCAL_API_URL,
  TRACK_DATA_TYPE_SIGNAL,
  TRACK_DATA_TYPE_GBANDS,
  TRACK_DATA_TYPE_BASE_PAIRS,
  COLOR1,
  COLOR2,
  COLOR3,
  COLOR4,
  COLOR5,
  COLOR6,
  COLOR7,
  COLOR8,
  MAX_BASE_PAIR_WIDTH,
  SIGNAL_COLORS,
  BASE_PAIR_COLORS,
  CHROMOSOME_SIZES,
  CHROMOSOME_START_BASE_PAIRS,
  CHROMOSOME_NAMES,
  DATA_SOURCE_GENOME,
  DATA_SOURCE_GWAS,
  DATA_SOURCE_EXSNP,
  DATA_SOURCE_CLINVAR,
  DATA_SOURCE_DBSNP,
  DATA_SOURCE_ENCODE,
  DATA_SOURCE_FASTA,
  DATA_SOURCE_EFO,
  DATA_SOURCE_ENCODEbigwig,
  DATA_SOURCE_ExAC,
  DATA_SOURCE_TCGA,
  DATA_SOURCE_ENSEMBL,
  DATA_SOURCE_GTEX,
  DATA_SOURCES,
  FILTER_TYPES,
  ENTITY_TYPE,
  TRACK_TYPE_SEQUENCE,
  TRACK_TYPE_FUNCTIONAL,
  TRACK_TYPE_GENOME,
  TRACK_TYPE_GWAS,
  TRACK_TYPE_EQTL,
  TRACK_TYPE_ENCODE,
  TRACK_TYPE_3D,
  TRACK_TYPE_NETWORK,
  TRACK_TYPE_BOOLEAN,
  VARIANT_TAGS,
};
