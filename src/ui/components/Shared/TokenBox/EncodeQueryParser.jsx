import { QueryParser } from 'valis';
const ALL = 'ALL';
const ANY = 'ANY';
const EOF = 'EOF';

function buildEncodeQueryParser(suggestions, limited=false) {
    const terminals = new Map();
    terminals.set('TRAIT', /"(.+?)"/g);
    terminals.set('GENE', /"(.+?)"/g);
    terminals.set('INFLUENCING', /influencing/g);
    terminals.set('INFLUENCED_BY', /influenced by/g);
    terminals.set('OF', /of/g);
    terminals.set('VARIANTS_T', /variants/g);
    terminals.set('GENE_T', /gene/g);
    terminals.set('TRAIT_T', /trait/g);
    terminals.set('NEAR', /near/g);
    terminals.set('IN', /^in/g);
    terminals.set('IN_PATHWAY_T', /in pathway/g);
    terminals.set('PATHWAY', /"(.+?)"/g);
    terminals.set('PROMOTER', /promoters/g);
    terminals.set('ENHANCER', /enhancers/g);
    terminals.set('IN_CELL', /in cell/g);
    terminals.set('TARGET', /"(.+?)"/g);
    terminals.set('CELL_TYPE', /"(.+?)"/g);
    terminals.set('CELL_TYPE_ENHANCER', /"(.+?)"/g);
    terminals.set('CELL_TYPE_PROMOTER', /"(.+?)"/g);
    terminals.set('CELL_TYPE_EQTL', /"(.+?)"/g);
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
    
    // distance window queries
    expansions.set('GENOMIC_DISTANCE', [ANY, '1kbp_T', '5kbp_T', '10kbp_T', '50kbp_T', '100kbp_T', '1mbp_T']);
    expansions.set('WITHIN_QUERY', [ALL, 'WITHIN_T', 'GENOMIC_DISTANCE', 'GENOME_QUERY'])
    expansions.set('GENOME_QUERY', [ANY, 'VARIANT_QUERY', 'GENE_QUERY']);    
    


    // variant's
    expansions.set('VARIANT_QUERY', [ALL, 'VARIANTS_T', 'VARIANT_QUERY_TYPE']);
    expansions.set('VARIANT_INFLUENCING_ARGS', [ANY, 'GENE_QUERY', 'TRAIT_QUERY']);
    expansions.set('VARIANT_INFLUENCING', [ALL, 'INFLUENCING', 'VARIANT_INFLUENCING_ARGS']);
    expansions.set('VARIANT_QUERY_TYPE', [ANY, 'VARIANT_INFLUENCING', 'NAMED_SNP_RS']);
    expansions.set('NAMED_SNP_RS', [ALL, 'NAMED', 'RS_T']);

    // eqtl's
    expansions.set('OF_GENE', [ALL, 'OF', 'GENE_QUERY'])
    expansions.set('EQTL_QUERY_TYPE', [ANY, 'OF_GENE', 'NAMED_SNP_RS', 'WITHIN_QUERY', 'IN_EQTL_CELL_TYPE']);
    expansions.set('IN_EQTL_CELL_TYPE', [ALL, 'IN', 'CELL_TYPE_EQTL']);
    expansions.set('EQTL_QUERY', [ALL, 'EQTL', 'EQTL_QUERY_TYPE']);

    
    // general annotation query
    expansions.set('ANNOTATION_QUERY', [ANY, 'GENE_QUERY', 'EQTL_QUERY', 'ENHANCER_QUERY',  'PROMOTER_QUERY']);

    // gene queries
    expansions.set('INFLUENCING_TRAIT', [ALL, 'INFLUENCING', 'TRAIT']);
    expansions.set('GENE_WITH_NAME', [ALL, 'NAMED', 'GENE']);
    expansions.set('GENE_QUERY', [ALL, 'GENE_T', 'GENE_QUERY_TYPES']);
    expansions.set('GENE_IN_PATHWAY', [ALL, 'IN_PATHWAY_T', 'PATHWAY']);
    expansions.set('GENE_QUERY_TYPES', [ANY, 'GENE_WITH_NAME', 'GENE_IN_PATHWAY']);

    // enhancer promoter queries
    expansions.set('ENHANCER_WITHIN_QUERY', [ALL, 'WITHIN_QUERY', 'IN_CELL', 'CELL_TYPE_ENHANCER'])
    expansions.set('ALL_ENHANCER_QUERY', [ALL, 'IN_CELL','CELL_TYPE_ENHANCER'])
    expansions.set('ENHANCER_QUERY_ARGS', [ANY, 'ENHANCER_WITHIN_QUERY', 'ALL_ENHANCER_QUERY']);
    expansions.set('ENHANCER_QUERY', [ALL, 'ENHANCER', 'ENHANCER_QUERY_ARGS'] );

    expansions.set('PROMOTER_WITHIN_QUERY', [ALL, 'WITHIN_QUERY', 'IN_CELL', 'CELL_TYPE_PROMOTER'])
    expansions.set('ALL_PROMOTER_QUERY', [ALL, 'IN_CELL','CELL_TYPE_PROMOTER'])
    expansions.set('PROMOTER_QUERY_ARGS', [ANY, 'PROMOTER_WITHIN_QUERY', 'ALL_ENHANCER_QUERY']);
    expansions.set('PROMOTER_QUERY', [ALL, 'PROMOTER', 'PROMOTER_QUERY_ARGS']);

    // trait queries:
    expansions.set('TRAIT_QUERY', [ALL, 'TRAIT_T', 'TRAIT']);

    // The root query rules
    if (limited) {
        expansions.set('ROOT', [ANY, 'VARIANT_QUERY', 'GENE_QUERY', 'ENHANCER_QUERY',  'PROMOTER_QUERY', 'TRAIT_QUERY']);
    } else {
        expansions.set('ROOT', [ANY, 'VARIANT_QUERY', 'GENE_QUERY', 'ENHANCER_QUERY',  'PROMOTER_QUERY', 'TRAIT_QUERY']);
    }
    

    // return empty result for rs prefix queries
    suggestions.set('RS_T', (q, num) => new Promise((resolve, reject) => resolve([])));
    return new QueryParser(expansions, terminals, suggestions);
}

export { buildEncodeQueryParser }