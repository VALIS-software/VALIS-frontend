export enum EntityType {
    SNP = 'SNP',
    GENE = 'gene',
    TRAIT = 'trait',
    GWAS = 'association:SNP:trait',
    EQTL = 'association:SNP:gene',
};

export default EntityType;