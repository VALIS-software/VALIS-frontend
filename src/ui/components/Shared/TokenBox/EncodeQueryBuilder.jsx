
import { QueryBuilder } from 'valis';

const builder = new QueryBuilder();


const STRIP_QUOTES = (x) => {
    return x.slice(1, x.length - 1);
}

const TRIM = (x) => {
    return x.replace(/(^[ '\^\$\*#&]+)|([ '\^\$\*#&]+$)/g, '');
}

const parseGenomicDistanceString = (str) => {
    let kbp = str.indexOf('kbp');
    let mbp = str.indexOf('mbp');
    if ( kbp >= 0) {
        return parseFloat(str.slice(0, kbp)) * 1000;
    } else if ( mbp >= 0) {
        return parseFloat(str.slice(0, mbp)) * 1000000;
    } else {
        return null;
    }
}

function buildWithinQuery(parsePath) {
    if (parsePath.length < 2) return null;
    const dist = parseGenomicDistanceString(parsePath[1].value);
    if (!dist) return null;
    const rest = parsePath.slice(2);
    let window = buildQuery(rest);
    if (!window) return null;
    return [window, dist];
}

function buildVariantQuery(parsePath) {
    if (!parsePath || parsePath.length < 3) return null;
    const token = parsePath[0];
    if (token.rule === 'INFLUENCING') {
        const toQuery = buildQuery(parsePath.slice(1));
        if (!toQuery) return null;
        builder.newEdgeQuery();
        builder.setToNode(toQuery);
        const edgeQuery = builder.build();
        builder.newGenomeQuery();
        builder.addToEdge(edgeQuery);
        if (parsePath[2].rule === 'TRAIT_T') builder.setSpecialGWASQuery();
        return builder.build();
    } else if (token.rule === 'NAMED') {
        const snpRS = TRIM(parsePath[1].value.toLowerCase());
        builder.newGenomeQuery();
        builder.filterID('Gsnp_' + snpRS);
        const snpQuery = builder.build();
        return snpQuery;
    }
    return null;
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
    } else if (token.rule === 'IN_PATHWAY_T') {
        const pathwayName = STRIP_QUOTES(parsePath[1].value);
        builder.newGenomeQuery();
        builder.filterPathway(pathwayName);
        return builder.build();
    }
}

function buildCellQuery(parsePath) {
    if (!parsePath || parsePath.length < 3) return null;
    const withinQuery = buildWithinQuery(parsePath.slice(3));
    if (!withinQuery) return null;
    const annotationType = (parsePath[0].rule == 'PROMOTER') ? "Promoter-like" : "Enhancer-like";
    const cellType = STRIP_QUOTES(parsePath[2].value);
    builder.newGenomeQuery();
    builder.filterType(annotationType);
    builder.filterBiosample(cellType);
    builder.setLimit(2000000);
    builder.addArithmeticWindow(withinQuery[0], withinQuery[1]);
    return builder.build();
}


function buildSNPrsQuery(parsePath) {
    builder.newGenomeQuery();
    builder.filterID('Gsnp_' + TRIM(parsePath[0].value.toLowerCase()));
    return builder.build();
}


function buildQuery(parsePath) {
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
    return query;
}

export { buildQuery };