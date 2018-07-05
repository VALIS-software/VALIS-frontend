import { QueryParser, buildQueryParser, Suggestion } from './queryparser';

function buildSuggestionFromArray(arr: string[]) {
    return (text: string, maxResults: number) => {
        return new Promise((resolve, reject) => {
            if (text.length === 0) {
                resolve(arr);
                return;
            } else {
                const ret: string[] = [];
                arr.forEach(val => {
                    if (val.toLowerCase().indexOf(text.toLowerCase()) >= 0) {
                        ret.push(val);
                    }
                });
                resolve(ret);
            }
        })
    };
}

function parseText(text: string): any {
    const geneSuggestions = buildSuggestionFromArray(['MAOA', 'MAOB', 'PCSK9', 'NF2']);
    const traitSuggestions = buildSuggestionFromArray(['Cancer', 'Alzheimers', 'Depression']);
    const cellSuggestions = buildSuggestionFromArray(['liver cells', 'lung cells', 'heart cells']);
    const annotationSuggestions = buildSuggestionFromArray(['promoters', 'enhancers']);

    const suggestions = new Map();
    suggestions.set('GENE', geneSuggestions);
    suggestions.set('TRAIT', traitSuggestions);
    suggestions.set('CELL_TYPE', cellSuggestions);
    suggestions.set('ANNOTATION_TYPE', annotationSuggestions);
    const parser: QueryParser = buildQueryParser(suggestions);
    return parser.getSuggestions(text);
}

test('test_empty_query', () => {
    const result: Suggestion = parseText('');
    const promise = result.suggestions;
    promise.then((results: string[]) => {
        expect(results.length).toBe(6);
    });
    return promise;
});

test('test_parse_variant_query_incomplete', () => {
    /* Test variant search returns correct suggestions */
    const result = parseText('variants');
    const promise = result.suggestions;
    promise.then((results: string[]) => {
        expect(results.length).toBe(1);
        expect(results[0]).toBe('influencing');
    });
    expect(result.tokens.length).toBe(1);
    expect(result.tokens[0].rule).toBe('VARIANTS');
    expect(result.query).toBe(null);
});

test('test_parse_variant_query_influencing', () => {
    /* Test autocomplete of gene trait */
    const result: Suggestion = parseText('variants influencing');
    const promise = result.suggestions;
    promise.then((results: string[]) => {
        expect(results.length).toBe(3);
    });
    expect(result.tokens.length).toBe(2);
    expect(result.query).toBe(null);
});

test('test_parse_gene_query_named_complete', () => {
    /* Test valid search text parses to Query */
    const result = parseText('gene named \"MAOA\"');
    const promise = result.suggestions;
    promise.then((results: string[]) => {
        expect(results[0]).toBe("MAOA");
        expect(results.length).toBe(1);
    });
    expect(result.tokens[0].rule).toBe('GENE_T');
    expect(result.tokens.length).toBe(4);
    expect(result.query).toBeTruthy();
});

test('test_parse_gene_query_named_prefix_quoted', () => {
    /* Test valid search text parses to Query */
    const result = parseText('gene named "MAO"');
    const promise = result.suggestions;
    promise.then((results: string[]) => {
        expect(results.indexOf("MAOA")).toBeGreaterThan(-1);
        expect(results.indexOf("MAOB")).toBeGreaterThan(-1);
        expect(results.length).toBe(2);
    });
    expect(result.tokens.length).toBe(4);
    expect(result.query).toBeTruthy();
});

test('test_parse_gene_query_influencing_complete', () => {
    /* Test valid search text parses to Query */
    const result = parseText('gene influencing \"Alzheimers\"');
    const promise = result.suggestions;
    promise.then((results: string[]) => {
        expect(results[0]).toBe("Alzheimers");
        expect(results.length).toBe(1);
    });
    expect(result.tokens[0].rule).toBe('GENE_T');
    expect(result.tokens.length).toBe(4);
    expect(result.query).toBeTruthy();
});

test('test_parse_gene_query_influencing_prefix_quoted', () => {
    /* Test valid search text parses to Query */
    const result = parseText('gene influencing \"Alzhe\"');
    const promise = result.suggestions;
    promise.then((results: string[]) => {
        expect(results[0]).toBe("Alzheimers");
        expect(results.length).toBe(1);
    });
    expect(result.tokens[0].rule).toBe('GENE_T');
    expect(result.tokens.length).toBe(4);
    expect(result.query).toBeTruthy();
});

test('test_parse_cell_query', () => {
    /* Test enhancer query parses properly */
    const result = parseText('enhancers in "heart cell"');
    const promise = result.suggestions;
    promise.then((results: string[]) => {
        expect(1).toBe(1);
    });
    const query = result.query;
    expect(query).toBeDefined();
    expect(query['filters']['type']).toBe('Enhancer-like');
    expect(query['filters']['info.biosample']).toBe('heart cell');
});
