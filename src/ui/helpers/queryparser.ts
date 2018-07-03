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
type SuggestionResultPromise = Promise<string[]>;
type SuggestionResultProvider = (text: string, numResults: number) => SuggestionResultPromise
export type Suggestion = {
    tokens: ParsedToken[],
    suggestions: Promise<string[]>,
    query: any,
    isQuoted: boolean
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

function mergeResults(promises: Promise<Array<string>>[]): Promise<Array<string>> {
    return Promise.all(promises).then((results: Array<string[]>) => {
        let allResults: string[] = [];
        results.forEach((result: string[]) => {
            allResults = allResults.concat(result);
        });
        return allResults;
    });
}

function buildVariantQuery(parsePath: ParsedToken[]): any {
    const token = parsePath[0];
    if (token.rule === 'INFLUENCING') {
        const traitName = STRIP_QUOTES(parsePath[1].value);
        return {
            "type": "GenomeNode",
            "filters": {

            },
            "toEdges": [
                {
                    "type": "EdgeNode",
                    "filters": {
                        "info.p-value": {
                            "<": 0.05
                        }
                    },
                    "toNode": {
                        "type": "InfoNode",
                        "filters": {
                            "type": "trait",
                            "$text": traitName,
                        },
                        "toEdges": [

                        ]
                    }
                }
            ],
            "limit": 10000000
        }
    }
}


function buildTraitQuery(parsePath: ParsedToken[]): any {
    const traitName = STRIP_QUOTES(parsePath[0].value);
    return { "type": "InfoNode", "filters": { "type": "trait", "$text": traitName }, "toEdges": [], "limit": 150 }
}

function buildGeneQuery(parsePath: ParsedToken[]): any {
    const geneName = STRIP_QUOTES(parsePath[0].value);
    return { "type": "GenomeNode", "filters": { "type": "gene", "name": geneName }, "toEdges": [], "limit": 150 }
}

function buildCellQuery(parsePath: ParsedToken[]): any {
    const cellType = STRIP_QUOTES(parsePath[2].value);

    const annotationType = (parsePath[0].rule == 'PROMOTER') ? "Promoter-like" : "Enhancer-like";
    return {
        "type": "GenomeNode",
        "filters": {
            "type": annotationType,
            "info.biosample": cellType
        },
        "toEdges": [],
        "arithmetics": [],
        "limit": 2000000
    }
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
    }
}


export class QueryParser {
    // grammar elements are expansions 
    private grammar: Expansions;
    private terminals: Map<Rule, TerminalRule>;
    private suggestions: Map<Rule, SuggestionResultProvider>;
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

    buildSuggestionsFromParse(results: ParsePath[], maxSuggestions = 15): Suggestion {
        const maxParse: ParsePath = results.reduce((a, b) => a.path.length > b.path.length ? a : b);
        const maxDepth: number = maxParse.path.length;
        const finalSuggestions: SuggestionResultPromise[] = [];
        let quoteSuggestion: boolean = false;
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

            if (this.suggestions.get(rule)) {
                tokenText = TRIM(tokenText).toLowerCase();
                quoteSuggestion = true;
                finalSuggestions.push(this.suggestions.get(rule)(tokenText, maxSuggestions / 2));
            } else {
                quoteSuggestion = false;
                finalSuggestions.push(new Promise((resolve, reject) => {
                    resolve([
                        REGEX_TO_STRING(this.terminals.get(rule))
                    ]);
                }));
            }
        });
        let query: any = null;
        if (maxParse.rule === EOF) {
            query = buildQuery(maxParse.path);
        }
        return {
            tokens: maxParse.path,
            suggestions: mergeResults(finalSuggestions),
            query: query,
            isQuoted: quoteSuggestion
        }
    }

    public getSuggestions(inputText: string, maxSuggestions: number = 15): Suggestion {
        const results = this.parse(inputText, this.grammar.get(ROOT));
        if (results.length === 0) return null;
        return this.buildSuggestionsFromParse(results, maxSuggestions);
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

    const expansions = new Map<Rule, Rule>();
    expansions.set('VARIANT_QUERY', [ALL, 'VARIANTS', 'INFLUENCING', 'TRAIT', EOF]);
    expansions.set('GENE_QUERY', [ALL, 'GENE_T', 'GENE', EOF]);
    expansions.set('ANNOTATION_TYPE', [ANY, 'PROMOTER', 'ENHANCER']);
    expansions.set('CELL_ANNOTATION', [ALL, 'ANNOTATION_TYPE', 'IN', 'CELL_TYPE']);
    expansions.set('ANNOTATION_QUERY', [ALL, 'CELL_ANNOTATION', EOF]);
    expansions.set('TRAIT_QUERY', [ALL, 'TRAIT_T', 'TRAIT', EOF]);
    expansions.set('ROOT', [ANY, 'VARIANT_QUERY', 'GENE_QUERY', 'TRAIT_QUERY', 'ANNOTATION_QUERY']);

    return new QueryParser(expansions, terminals, suggestions);
}

export default buildQueryParser;