import { QueryParser } from 'valis';
const ALL = 'ALL';
const ANY = 'ANY';
const EOF = 'EOF';

function buildEncodeQueryParser(suggestions) {
    const terminals = new Map();
    terminals.set('TRAIT', /"(.+?)"/g);
    terminals.set('GENE', /"(.+?)"/g);
    terminals.set('INFLUENCING', /influencing/g);
    terminals.set('OF', /of/g);
    terminals.set('VARIANTS', /variants/g);
    terminals.set('GENE_T', /gene/g);
    terminals.set('TRAIT_T', /trait/g);
    terminals.set('NEAR', /near/g);
    terminals.set('IN', /in/g);
    terminals.set('IN_PATHWAY_T', /in pathway/g);
    terminals.set('PATHWAY', /"(.+?)"/g);
    terminals.set('PROMOTER', /promoters/g);
    terminals.set('ENHANCER', /enhancers/g);
    terminals.set('TARGET', /"(.+?)"/g);
    terminals.set('CELL_TYPE', /"(.+?)"/g);
    terminals.set('EQTL', /eqtl/g);
    terminals.set('NAMED', /named/g);
    terminals.set('TUMOR_SITE', /"(.+?)"/g);
    terminals.set('WITH_TUMOR', /with tumor/g);
    terminals.set('RS_T', /rs\d+$/g);
    terminals.set('NUMBER', /^\d+$/g);
    terminals.set('WITHIN_T', /within/g);
    terminals.set('100bp_T', /100bp of/g);
    terminals.set('1kbp_T', /1kbp of/g);
    terminals.set('5kbp_T', /5kbp of/g);
    terminals.set('10kbp_T', /10kbp of/g);
    terminals.set('50kbp_T', /50kbp of/g);
    terminals.set('100kbp_T', /100kbp of/g);
    terminals.set('1mbp_T', /1mbp of/g);


    const expansions = new Map();
    expansions.set('DIST_QUERY', [ANY, '1kbp_T', '5kbp_T', '10kbp_T', '50kbp_T', '100kbp_T', '1mbp_T']);
    expansions.set('GENE_IN_PATHWAY', [ALL, 'IN_PATHWAY_T', 'PATHWAY','OPTIONAL_WITHIN']);
    expansions.set('GENE_QUERY_TYPE', [ANY, 'INFLUENCING_TRAIT', 'NAMED_GENE', 'GENE_IN_PATHWAY', 'WITHIN_QUERY']);
    expansions.set('IN_EQTL_CELL_TYPE', [ALL, 'IN', 'CELL_TYPE_EQTL']);
    expansions.set('OF_GENE', [ALL, 'OF', 'GENE'])
    expansions.set('EQTL_QUERY_TYPE', [ANY, 'OF_GENE', 'NAMED_SNP_RS', 'WITHIN_QUERY', 'IN_EQTL_CELL_TYPE']);
    expansions.set('VARIANT_QUERY_TYPE', [ANY, 'INFLUENCING_TRAIT', 'NAMED_SNP_RS', 'WITHIN_QUERY', 'OF_ANNOTATION_QUERY']);
    expansions.set('OPTIONAL_WITHIN', [ANY, 'WITHIN_QUERY', EOF]);
    expansions.set('ANNOTATION_QUERY', [ANY, 'GENE_QUERY', 'EQTL_QUERY', 'ENHANCER_QUERY',  'PROMOTER_QUERY']);
    expansions.set('OF_ANNOTATION_QUERY', [ALL, 'OF', 'ANNOTATION_QUERY',  EOF]);
    expansions.set('INFLUENCING_TRAIT', [ALL, 'INFLUENCING', 'TRAIT', 'OPTIONAL_WITHIN']);
    expansions.set('INFLUENCING_GENE', [ALL, 'INFLUENCING', 'GENE']);
    expansions.set('NAMED_GENE', [ALL, 'NAMED', 'GENE']);
    expansions.set('NAMED_SNP_RS', [ALL, 'NAMED', 'RS_T']);
    expansions.set('ENHANCER_QUERY', [ALL, 'ENHANCER', 'IN', 'CELL_TYPE_ENHANCER', 'OPTIONAL_WITHIN']);
    expansions.set('PROMOTER_QUERY', [ALL, 'PROMOTER', 'IN', 'CELL_TYPE_PROMOTER', 'OPTIONAL_WITHIN']);
    expansions.set('WITHIN_QUERY', [ALL, 'WITHIN_T', 'DIST_QUERY', 'GENOME_QUERY', EOF])
    // The root query rules
    expansions.set('VARIANT_QUERY', [ALL, 'VARIANTS', 'VARIANT_QUERY_TYPE', EOF]);
    expansions.set('GENE_QUERY', [ALL, 'GENE_T', 'GENE_QUERY_TYPE', EOF]);
    expansions.set('TRAIT_QUERY', [ALL, 'TRAIT_T', 'TRAIT', EOF]);
    expansions.set('EQTL_QUERY', [ALL, 'EQTL', 'EQTL_QUERY_TYPE', EOF]);
    expansions.set('GENOME_QUERY', [ANY, 'VARIANT_QUERY', 'GENE_QUERY', 'EQTL_QUERY', 'ENHANCER_QUERY', 'PROMOTER_QUERY',]);
    expansions.set('ROOT', [ANY, 'VARIANT_QUERY', 'GENE_QUERY', 'EQTL_QUERY', 'ENHANCER_QUERY',  'PROMOTER_QUERY','TRAIT_QUERY']);

    // return empty result for rs prefix queries
    suggestions.set('RS_T', (q, num) => new Promise((resolve, reject) => resolve([])));
    return new QueryParser(expansions, terminals, suggestions);
}

export { buildEncodeQueryParser }