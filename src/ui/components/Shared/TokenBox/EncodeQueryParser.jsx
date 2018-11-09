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

    const expansions = new Map();
    expansions.set('GENE_IN_PATHWAY', [ALL, 'IN_PATHWAY_T', 'PATHWAY']);
    expansions.set('GENE_QUERY_TYPE', [ANY, 'INFLUENCING_TRAIT', 'NAMED_GENE', 'GENE_IN_PATHWAY']);
    expansions.set('EQTL_QUERY_TYPE', [ANY, 'INFLUENCING_GENE', 'NAMED_SNP_RS']);
    expansions.set('VARIANT_QUERY_TYPE', [ANY, 'INFLUENCING_TRAIT']);
    expansions.set('INFLUENCING_TRAIT', [ALL, 'INFLUENCING', 'TRAIT']);
    expansions.set('INFLUENCING_GENE', [ALL, 'INFLUENCING', 'GENE']);
    expansions.set('NAMED_GENE', [ALL, 'NAMED', 'GENE']);
    expansions.set('NAMED_SNP_RS', [ALL, 'NAMED', 'RS_T']);
    expansions.set('ANNOTATION_TYPE', [ANY, 'PROMOTER', 'ENHANCER']);
    expansions.set('CELL_ANNOTATION', [ALL, 'ANNOTATION_TYPE', 'OF', 'TARGET', 'IN', 'CELL_TYPE']);
    // The root query rules
    expansions.set('VARIANT_QUERY', [ALL, 'VARIANTS', 'VARIANT_QUERY_TYPE', EOF]);
    expansions.set('GENE_QUERY', [ALL, 'GENE_T', 'GENE_QUERY_TYPE', EOF]);
    expansions.set('TRAIT_QUERY', [ALL, 'TRAIT_T', 'TRAIT', EOF]);
    expansions.set('EQTL_QUERY', [ALL, 'EQTL', 'EQTL_QUERY_TYPE', EOF]);
    expansions.set('ANNOTATION_QUERY', [ALL, 'CELL_ANNOTATION', EOF]);
    expansions.set('ROOT', [ANY, 'VARIANT_QUERY', 'GENE_QUERY']);

    // return empty result for rs prefix queries
    
    return new QueryParser(expansions, terminals, suggestions);
}

export { buildEncodeQueryParser }