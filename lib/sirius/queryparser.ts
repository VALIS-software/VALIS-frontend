import QueryBuilder from "./QueryBuilder";

class ParsedToken {
    public rule: Rule;
    public value: string;
    constructor(rule: Rule, value: string) {
        this.rule = rule;
        this.value = value;
    }
}

class ParsePath {
    public rule: Rule;
    public value: any;
    public path: ParsedToken[];
    public isTerminal: boolean;
    constructor(rule: Rule, value: string, path: ParsedToken[], isTerminal: boolean) {
        this.rule = rule;
        this.value = value;
        this.path = path;
        this.isTerminal = isTerminal;
    }
}

type TokenType = string;
type TerminalRule = RegExp;
type Rule = TokenType | TokenType[];
type Expansions = Map<Rule, Rule>;
type Terminals = Map<Rule, TerminalRule>;

export type SuggestionResultPromise = Promise<SingleSuggestion[]>;
export type SuggestionResultProvider = (text: string, numResults: number) => SuggestionResultPromise
export type SingleSuggestion = { rule: TokenType, value: string };
export type Suggestion = {
    tokens: ParsedToken[],
    suggestions: Promise<SingleSuggestion[]>,
    additionalSuggestions: Promise<SingleSuggestion[]>,
    query: any,
    isQuoted: boolean,
    hintText: string
};

const EOF: TokenType = 'EOF';
const ANY: TokenType = 'ANY';
const ALL: TokenType = 'ALL';
const ROOT: TokenType = 'ROOT';

const STRIP_QUOTES = (x: string): string => {
    return x.slice(1, x.length - 1);
}

const TRIM = (x: string): string => {
    return x.replace(/(^[ '\^\$\*#&]+)|([ '\^\$\*#&]+$)/g, '');
}

const REGEX_TO_STRING = (x: RegExp): string => {
    const str = x.toString();
    return str.slice(1, str.length - 2);
}

const REGEX_HAS_QUOTES = (x: RegExp): boolean => {
    const a = REGEX_TO_STRING(x);
    return a[0] === "\"" && a[a.length - 1] ===  "\"";
}

function mergeResults(promises: Promise<Array<SingleSuggestion>>[]): Promise<Array<SingleSuggestion>> {
    return Promise.all(promises).then((results: Array<SingleSuggestion[]>) => {
        let allResults: SingleSuggestion[] = [];
        results.forEach((result: SingleSuggestion[]) => {
            allResults = allResults.concat(result);
        });
        return allResults;
    });
}

const builder = new QueryBuilder();

function buildVariantQuery(parsePath: ParsedToken[]): any {
    const token = parsePath[0];
    if (token.rule === 'INFLUENCING') {
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
        return builder.build();
    }
}

function buildTraitQuery(parsePath: ParsedToken[]): any {
    const traitName = STRIP_QUOTES(parsePath[0].value);
    builder.newInfoQuery();
    builder.filterType("trait");
    builder.searchText(traitName);
    return builder.build();
}

function buildGeneQuery(parsePath: ParsedToken[]): any {
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
    }
}

function buildCellQuery(parsePath: ParsedToken[]): any {
    const cellType = STRIP_QUOTES(parsePath[2].value);
    const annotationType = (parsePath[0].rule == 'PROMOTER') ? "Promoter-like" : "Enhancer-like";
    builder.newGenomeQuery();
    builder.filterType(annotationType);
    builder.filterBiosample(cellType);
    builder.setLimit(2000000);
    return builder.build();
}

function buildEQTLQuery(parsePath: ParsedToken[]): any {
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
    }
}

function buildPatientQuery(parsePath: ParsedToken[]): any {
    const token = parsePath[0];
    if (token.rule === 'WITH_TUMOR') {
        const tumorSite = STRIP_QUOTES(parsePath[1].value);
        builder.newInfoQuery();
        builder.filterType('patient');
        builder.filterBiosample(tumorSite);
        builder.setLimit(1000000);
        return builder.build();
    }
}

function buildSNPrsQuery(parsePath: ParsedToken[]): any {
    builder.newGenomeQuery();
    builder.filterID('Gsnp_' + TRIM(parsePath[0].value.toLowerCase()));
    return builder.build();
}

function buildFullTextQuery(inputText: string) : any {
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

function buildQuery(parsePath: ParsedToken[]): any {
    const token: ParsedToken = parsePath[0];
    if (token.rule === 'VARIANTS') {
        return buildVariantQuery(parsePath.slice(1));
    } else if (token.rule === 'GENE_T') {
        return buildGeneQuery(parsePath.slice(1));
    } else if (token.rule === 'TRAIT_T') {
        return buildTraitQuery(parsePath.slice(1));
    } else if (token.rule === 'PROMOTER' || token.rule === 'ENHANCER') {
        return buildCellQuery(parsePath);
    } else if (token.rule === 'EQTL') {
        return buildEQTLQuery(parsePath.slice(1));
    } else if (token.rule === 'PATIENT_T') {
        return buildPatientQuery(parsePath.slice(1));
    } else if (token.rule === 'RS_T') {
        return buildSNPrsQuery(parsePath);
    }
}


export class QueryParser {
    // grammar elements are expansions
    private terminals: Map<Rule, TerminalRule>;
    private suggestions: Map<Rule, SuggestionResultProvider>;
    private grammar: Expansions;
    constructor(grammar: Expansions, terminals: Terminals, suggestions: Map<Rule, SuggestionResultProvider>) {
        this.grammar = grammar;
        this.terminals = terminals;
        this.suggestions = suggestions;
    }

    eat(soFar: string, rule: Rule): { parsed: string, rest: string } {
        soFar = TRIM(soFar);
        const soFarLowerCase = soFar.toLowerCase();
        const regExp: RegExp = this.terminals.get(rule);
        regExp.lastIndex = 0;
        const result: RegExpExecArray = regExp.exec(soFarLowerCase);
        if (result !== null) {
            const offset = result.index + result[0].length;
            return { parsed: soFar.slice(0, offset), rest: soFar.slice(offset) };
        } else {
            return { parsed: null, rest: soFar };
        }
    }

    parse(soFar: string, rule: Rule, path: ParsedToken[] = []): ParsePath[] {
        if (rule === EOF && soFar.length === 0) {
            const newPath = path.slice(0);
            newPath.push(new ParsedToken(EOF, ''));
            return [new ParsePath(rule, soFar, newPath, true)];
        } else if (this.terminals.get(rule) !== undefined) {
            const parsed = this.eat(soFar, rule).parsed;
            if (parsed !== null) {
                const pathCopy = path.slice(0);
                pathCopy.push(new ParsedToken(rule, parsed));
                return [new ParsePath(rule, parsed, pathCopy, true)];
            } else {
                return [new ParsePath(rule, soFar, path.slice(0), false)]
            }
        } else if (this.grammar.get(rule)) {
            // expand this rule and return result
            const expandedRule: Rule = this.grammar.get(rule) as Rule;
            return this.parse(soFar, expandedRule, path.slice(0));
        } else if (rule[0] === ANY) {
            // just union all possible parse paths together
            const options = (rule as TokenType[]).slice(1);
            let possibilities: ParsePath[] = [];
            options.forEach((subRule: Rule) => {
                possibilities = possibilities.concat(this.parse(soFar, subRule, path.slice(0)));
            });
            return possibilities;
        } else if (rule[0] === ALL) {
            if (this.terminals.get(rule[1])) {
                const { parsed, rest } = this.eat(soFar, rule[1]);
                const newPath = path.slice(0);
                newPath.push(new ParsedToken(rule[1], parsed));
                if (rest === soFar || parsed === null) {
                    // we were not able to eat a token! return suggestions for the current token rule
                    return this.parse(soFar, rule[1], path.slice(0));
                } else {
                    const remainingRules = rule.slice(2);
                    if (remainingRules.length === 0) {
                        return [];
                    } else if (remainingRules.length === 1) {
                        const ret = this.parse(rest, rule[2], newPath);
                        return ret;
                    } else {
                        return this.parse(rest, [ALL].concat(remainingRules), newPath);
                    }
                }
            } else if (this.grammar.get(rule[1])) {
                const expandedRule: Rule = this.grammar.get(rule[1]) as Rule;
                // try parsing the first rule in the ALL clause
                const tryParseResults: ParsePath[] = this.parse(soFar, expandedRule, path.slice(0));

                // get the maximum parse depth of all possible paths
                const maxParse: ParsePath = tryParseResults.reduce((a, b) => a.path.length > b.path.length ? a : b);;
                const maxDepth: number = maxParse.path ? maxParse.path.length : 0;
                const paths: ParsePath[] = [];

                // filter to the max depth parses and try to continue
                let maxDepthPaths = tryParseResults.filter(x => x.path.length === maxDepth);
                for (let i = 0; i < maxDepthPaths.length; i++) {
                    const subParse = maxDepthPaths[i];
                    if (subParse.isTerminal) {
                        // if the parser has fully parsed the first rule
                        const parsedSoFar: string = subParse.path.slice(path.length).map((x: ParsePath) => x.value).join(' ');
                        const cleanedSoFar: string = TRIM(soFar);
                        const idxTo = cleanedSoFar.indexOf(parsedSoFar)
                        const rest: string = cleanedSoFar.slice(idxTo + parsedSoFar.length);
                        if (rule.slice(2).length === 0) {
                            paths.push(new ParsePath(subParse.rule, subParse.value, subParse.path, subParse.isTerminal));
                        } else if (rule.slice(2).length === 1) {
                            return this.parse(rest, rule[2], subParse.path.slice(0));
                        } else {
                            return this.parse(rest, [ALL].concat(rule.slice(2)), subParse.path.slice(0));
                        }
                    } else {
                        // otherwise return suggestions for the first rule in the ALL clasue
                        paths.push(new ParsePath(subParse.rule, subParse.value, subParse.path.slice(0), subParse.isTerminal));
                    }
                }
                return paths;
            }
        }
        return [];
    }

    buildSuggestionsFromParse(inputText: string, results: ParsePath[], maxSuggestions = 15): Suggestion {
        const maxParse: ParsePath = results.reduce((a, b) => a.path.length > b.path.length ? a : b);
        const maxDepth: number = maxParse.path.length;
        const finalSuggestions: SuggestionResultPromise[] = [];
        let quoteSuggestion: boolean = false;
        let hintText = '';
        results.filter(x => x.path.length === maxDepth).forEach(subPath => {
            let rule: Rule = subPath.rule;
            let tokenText: string = subPath.value;
            if (subPath.rule === EOF) {
                // ignore the EOF and keep giving suggestions for the previous token
                rule = subPath.path[subPath.path.length - 2].rule;
                //set the token text to the text with '"' characters removed
                const val: string = subPath.path[subPath.path.length - 2].value;
                tokenText = val.slice(1, val.length - 1);
            }
            if (this.terminals.has(rule) && REGEX_HAS_QUOTES(this.terminals.get(rule))) quoteSuggestion = true;
            if (this.suggestions.get(rule)) {
                tokenText = TRIM(tokenText).toLowerCase();
                finalSuggestions.push(this.suggestions.get(rule)(tokenText, maxSuggestions / 2));
            } else {
                finalSuggestions.push(new Promise((resolve, reject) => {
                    resolve([
                        { rule: rule as TokenType, value: REGEX_TO_STRING(this.terminals.get(rule)) }
                    ]);
                }));
            }
        });
        let query: any = null;
        let additionalSuggestions: Promise<Array<SingleSuggestion>> = null;
        if (maxParse.rule === EOF) {
            query = buildQuery(maxParse.path);
        } else if (maxParse.path.length === 0) {
            // if no prefixes match, then we just want to return raw query completions!
            query = buildFullTextQuery(inputText);
            const geneSuggestions = this.suggestions.get('GENE')(inputText, maxSuggestions/2);
            const traitSuggestions = this.suggestions.get('TRAIT')(inputText, maxSuggestions/2);
            additionalSuggestions = mergeResults([geneSuggestions, traitSuggestions]);
            hintText = 'gene, trait or rs#'
        }
        return {
            tokens: maxParse.path,
            suggestions: mergeResults(finalSuggestions),
            additionalSuggestions: additionalSuggestions,
            query: query,
            isQuoted: quoteSuggestion,
            hintText: hintText,
        }
    }

    public getSuggestions(inputText: string, maxSuggestions: number = 15): Suggestion {
        const results = this.parse(inputText, this.grammar.get(ROOT));
        if (results.length === 0) return null;
        return this.buildSuggestionsFromParse(inputText, results, maxSuggestions);
    }
}

export function buildQueryParser(suggestions: Map<Rule, SuggestionResultProvider>): QueryParser {
    const terminals = new Map<Rule, RegExp>();
    terminals.set('TRAIT', /"(.+?)"/g);
    terminals.set('GENE', /"(.+?)"/g);
    terminals.set('INFLUENCING', /influencing/g);
    terminals.set('OF', /of/g);
    terminals.set('VARIANTS', /variants/g);
    terminals.set('GENE_T', /gene/g);
    terminals.set('TRAIT_T', /trait/g);
    terminals.set('NEAR', /near/g);
    terminals.set('IN', /in/g);
    terminals.set('PROMOTER', /promoters/g);
    terminals.set('ENHANCER', /enhancers/g);
    terminals.set('CELL_TYPE', /"(.+?)"/g);
    terminals.set('EQTL', /eqtl/g);
    terminals.set('NAMED', /named/g);
    terminals.set('TUMOR_SITE', /"(.+?)"/g);
    terminals.set('PATIENT_T', /patient/g);
    terminals.set('WITH_TUMOR', /with tumor/g);
    terminals.set('RS_T', /rs(.*)/g);
    terminals.set('NUMBER', /^\d+$/g);

    const expansions = new Map<Rule, Rule>();
    expansions.set('VARIANT_QUERY', [ALL, 'VARIANTS', 'INFLUENCING', 'TRAIT', EOF]);
    expansions.set('NAMED_OR_INFLUENCEING', [ANY, 'INFLUENCING_TRAIT', 'NAMED_GENE']);
    expansions.set('INFLUENCING_TRAIT', [ALL, 'INFLUENCING', 'TRAIT']);
    expansions.set('NAMED_GENE', [ALL, 'NAMED', 'GENE']);
    expansions.set('GENE_QUERY', [ALL, 'GENE_T', 'NAMED_OR_INFLUENCEING', EOF]);
    expansions.set('ANNOTATION_TYPE', [ANY, 'PROMOTER', 'ENHANCER']);
    expansions.set('CELL_ANNOTATION', [ALL, 'ANNOTATION_TYPE', 'IN', 'CELL_TYPE']);
    expansions.set('ANNOTATION_QUERY', [ALL, 'CELL_ANNOTATION', EOF]);
    expansions.set('TRAIT_QUERY', [ALL, 'TRAIT_T', 'TRAIT', EOF]);
    expansions.set('EQTL_QUERY', [ALL, 'EQTL', 'INFLUENCING', 'GENE', EOF]);
    expansions.set('PATIENT_QUERY', [ALL, 'PATIENT_T', 'WITH_TUMOR', 'TUMOR_SITE', EOF]);
    expansions.set('SNP_RS_QUERY', [ALL, 'RS_T', EOF]);
    expansions.set('ROOT', [ANY, 'VARIANT_QUERY', 'GENE_QUERY', 'TRAIT_QUERY', 'EQTL_QUERY', 'SNP_RS_QUERY']);

    // return empty result for rs prefix queries
    suggestions.set('RS_T', (q: string, num: number) => new Promise((resolve, reject) => resolve([])));
    return new QueryParser(expansions, terminals, suggestions);
}

export default buildQueryParser;
