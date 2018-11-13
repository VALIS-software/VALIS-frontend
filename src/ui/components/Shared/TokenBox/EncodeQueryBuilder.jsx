
import { QueryBuilder } from 'valis';

const builder = new QueryBuilder();


const STRIP_QUOTES = (x) => {
    return x.slice(1, x.length - 1);
}

const TRIM = (x) => {
    return x.replace(/(^[ '\^\$\*#&]+)|([ '\^\$\*#&]+$)/g, '');
}

function buildVariantQuery(parsePath) {
    if (!parsePath || parsePath.length < 2) return null;
    const token = parsePath[0];
    if (token.rule === 'INFLUENCING') {
        const traitName = STRIP_QUOTES(parsePath[1].value);
        builder.newInfoQuery();
        builder.filterType("trait");
        builder.searchText(traitName);
        const traitQuery = builder.build();
        builder.newEdgeQuery();
        builder.setToNode(traitQuery);
        const edgeQuery = builder.build();
        builder.newGenomeQuery();
        builder.addToEdge(edgeQuery);
        builder.setSpecialGWASQuery();
        return builder.build();
    } else if (token.rule === 'NAMED') {
        const snpRS = TRIM(parsePath[1].value.toLowerCase());
        builder.newGenomeQuery();
        builder.filterID('Gsnp_' + snpRS);
        const snpQuery = builder.build();
        return snpQuery;
    }
}

function buildTraitQuery(parsePath) {
    if (!parsePath || parsePath.length < 1) return null;
    const traitName = STRIP_QUOTES(parsePath[0].value);
    builder.newInfoQuery();
    builder.filterType("trait");
    builder.searchText(traitName);
    return builder.build();
}

function buildGeneQuery(parsePath) {
    if (!parsePath || parsePath.length < 2) return null;
    const token = parsePath[0];
    if (token.rule === 'NAMED') {
        const geneName = STRIP_QUOTES(parsePath[1].value);
        builder.newGenomeQuery();
        builder.filterName(geneName.toUpperCase());
        return builder.build();
    } else if (token.rule === 'INFLUENCING') {
        const traitName = STRIP_QUOTES(parsePath[1].value);
        builder.newInfoQuery();
        builder.filterType("trait");
        builder.searchText(traitName);
        const traitQuery = builder.build();
        builder.newEdgeQuery();
        builder.setToNode(traitQuery);
        builder.filterMaxPValue(0.05);
        const edgeQuery = builder.build();
        builder.newGenomeQuery();
        builder.addToEdge(edgeQuery);
        builder.setLimit(1000000);
        const variantQuery = builder.build();
        builder.newGenomeQuery();
        builder.filterType("gene");
        builder.addArithmeticIntersect(variantQuery);
        return builder.build();
    } else if (token.rule === 'IN_PATHWAY_T') {
        const pathwayName = STRIP_QUOTES(parsePath[1].value);
        builder.newGenomeQuery();
        builder.filterPathway(pathwayName);
        return builder.build();
    }
}

function buildCellQuery(parsePath) {
    if (!parsePath || parsePath.length < 2) return null;
    const annotationType = (parsePath[0].rule == 'PROMOTER') ? "Promoter-like" : "Enhancer-like";
    const cellType = STRIP_QUOTES(parsePath[1].value);
    builder.newGenomeQuery();
    builder.filterType(annotationType);
    builder.filterBiosample(cellType);
    builder.setLimit(2000000);
    return builder.build();
}

function buildEQTLQuery(parsePath) {
    const token = parsePath[0];
    if (token.rule === 'INFLUENCING') {
        const geneName = STRIP_QUOTES(parsePath[1].value);
        builder.newGenomeQuery();
        builder.filterName(geneName.toUpperCase());
        const geneQuery = builder.build()
        builder.newEdgeQuery();
        builder.setToNode(geneQuery);
        const edgeQuery = builder.build();
        builder.newGenomeQuery();
        builder.addToEdge(edgeQuery);
        builder.setLimit(1000000);
        return builder.build();
    } else if (token.rule === 'NAMED') {
        const snpRS = TRIM(parsePath[1].value.toLowerCase());
        builder.newGenomeQuery();
        builder.filterID('Gsnp_' + snpRS);
        const snpQuery = builder.build();
        builder.newEdgeQuery();
        builder.setToNode(snpQuery, true);
        const edgeQuery = builder.build();
        return edgeQuery;
    }
}


function buildSNPrsQuery(parsePath) {
    builder.newGenomeQuery();
    builder.filterID('Gsnp_' + TRIM(parsePath[0].value.toLowerCase()));
    return builder.build();
}

function buildFullTextQuery(inputText)  {
    if (!inputText) return null;
    const isAllUpper = inputText === inputText.toUpperCase();
    const suffixIsNumber = !isNaN(+inputText[inputText.length - 1]);
    if (inputText.length > 5 && !isAllUpper && !suffixIsNumber) {
        builder.newInfoQuery();
        builder.filterType('trait');
        builder.searchText(inputText);
    } else {
        builder.newGenomeQuery();
        builder.filterType('gene');
        builder.filterName(inputText.toUpperCase());
    }

    return builder.build();
}

function buildQuery(parsePath) {
    console.log(parsePath);
    if (!parsePath || parsePath.length === 0) return null;
    const token= parsePath[0];
    let query = null;
    if (token.rule === 'VARIANTS_T') {
        query = buildVariantQuery(parsePath.slice(1));
    } else if (token.rule === 'GENE_T') {
        query = buildGeneQuery(parsePath.slice(1));
    } else if (token.rule === 'TRAIT_T') {
        query = buildTraitQuery(parsePath.slice(1));
    } else if (token.rule === 'PROMOTER' || token.rule === 'ENHANCER') {
        query = buildCellQuery(parsePath);
    } else if (token.rule === 'EQTL') {
        query = buildEQTLQuery(parsePath.slice(1));
    } else if (token.rule === 'PATIENT_T') {
        query = buildPatientQuery(parsePath.slice(1));
    } else if (token.rule === 'RS_T') {
        query = buildSNPrsQuery(parsePath);
    }
    console.log(query);
    return query;
}

export { buildQuery };