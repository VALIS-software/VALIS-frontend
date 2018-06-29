const _ = require("underscore");

type TokenType = string;
type TerminalRule = RegExp;
type Rule = TokenType | Array<TokenType>;
type Expansions = Map<Rule, Rule>;
type Terminals = Map<Rule, TerminalRule>;
type SuggestionResultPromise = Promise<Array<string>>;
type SuggestionResultProvider = (text: string, numResults: number) => SuggestionResultPromise
type Suggestion = {
    path: ParsePath,
    suggestions: Array<SuggestionResultPromise>,
    query: any,
    isQuoted: boolean
};

const EOF: TokenType = 'EOF';
const ANY: TokenType = 'ANY';
const ALL: TokenType = 'ALL';
const ROOT: TokenType = 'ROOT';

const TRIM = (x: string): string => {
    return x.replace(/(^[ '\^\$\*#&]+)|([ '\^\$\*#&]+$)/g, '');
}

const REGEX_TO_STRING = (x: RegExp): string => {
    const str = x.toString();
    return str.slice(1, str.length - 2);
}

const DEFAULT_GRAMMAR: any = {
    terminals: {
        'TRAIT': /"(.+?)"/g,
        'GENE': /"(.+?)"/g,
        'INFLUENCING': /influencing/g,
        'OF': /of/g,
        'VARIANTS': /variants/g,
        'GENE_T': /gene/g,
        'TRAIT_T': /trait/g,
        'NEAR': /near/g,
        'IN': /in/g,
        'PROMOTER': /promoters/g,
        'ENHANCER': /enhancers/g,
        'CELL_TYPE': /"(.+?)"/g
    },
    expansions: {
        'VARIANT_QUERY': [ALL, 'VARIANTS', 'INFLUENCING', 'TRAIT', EOF],
        'GENE_QUERY': [ALL, 'GENE_T', 'GENE', EOF],
        'ANNOTATION_TYPE': [ANY, 'PROMOTER', 'ENHANCER'],
        'CELL_ANNOTATION': [ALL, 'ANNOTATION_TYPE', 'IN', 'CELL_TYPE'],
        'ANNOTATION_QUERY': [ALL, 'CELL_ANNOTATION', EOF],
        'TRAIT_QUERY': [ALL, 'TRAIT_T', 'TRAIT', EOF],
        'ROOT': [ANY, 'VARIANT_QUERY', 'GENE_QUERY', 'TRAIT_QUERY', 'ANNOTATION_QUERY']
    }
};

export class ParsedToken {
    public rule: Rule;
    public value: string;
    constructor(rule: Rule, value: string) {
        this.rule = rule;
        this.value = value;
    }
}


export class ParsePath {
    public rule: Rule;
    public value: any;
    public path: Array<any>;
    public isTerminal: boolean;
    constructor(rule: Rule, value: string, path: Array<ParsedToken>, isTerminal: boolean) {
        this.rule = rule;
        this.value = value;
        this.path = path;
        this.isTerminal = isTerminal;
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
        const result: RegExpMatchArray = soFarLowerCase.match(this.terminals.get(rule));
        if (result !== null) {
            const offset = result.index;
            return { parsed: soFar.slice(0, offset), rest: soFar.slice(offset) };
        } else {
            return { parsed: null, rest: soFar };
        }
    }

    parse(soFar: string, rule: Rule, path: Array<ParsedToken> = []): Array<ParsePath> {
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
            const options = (rule as Array<TokenType>).slice(1);
            let possibilities: Array<ParsePath> = [];
            options.forEach((subRule: Rule) => {
                possibilities = possibilities.concat(this.parse(soFar, subRule, path.slice(0)));
            });
            return possibilities;
        } else if (rule[0] == ALL) {
            const expandedRule: Rule = this.grammar.get(rule[1]) as Rule;
            const tryParseResults: Array<ParsePath> = this.parse(soFar, expandedRule, path.slice(0));
            const maxParse: ParsePath = _.max(tryParseResults, (x: ParsePath) => { x.path.length; })
            const maxDepth: number = maxParse.path.length;
            const paths: Array<ParsePath> = [];
            tryParseResults.forEach((subParse) => {
                if (subParse.path.length === maxDepth) {
                    if (subParse.isTerminal) {
                        const parsedSoFar: string = subParse.path.slice(path.length).map((x: ParsePath) => x.value).join(' ');
                        const cleanedSoFar: string = TRIM(soFar);
                        const idxTo = cleanedSoFar.indexOf(parsedSoFar)
                        const rest: string = cleanedSoFar.slice(idxTo + parsedSoFar.length);
                        if (rule.slice(2).length === 0) {
                            paths.push(new ParsePath(subParse.rule, subParse.value, subParse.path, subParse.isTerminal))
                        } else if (rule.slice(2).length == 1) {
                            return this.parse(rest, rule[2], subParse.path.slice(0))
                        } else {
                            return this.parse(rest, [ALL].concat(rule.slice(2)), subParse.path.slice(0))
                        }
                    } else {
                        paths.push(new ParsePath(subParse.rule, subParse.value, subParse.path, subParse.isTerminal))
                    }
                }
            });
            return paths;
        }
        return [];
    }

    buildSuggestionsFromParse(results: Array<ParsePath>, maxSuggestions = 15): Suggestion {
        const maxParse: ParsePath = _.max(results, (x: ParsePath) => { x.path.length; })
        const maxDepth: number = maxParse.path.length;
        const finalSuggestions: Array<SuggestionResultPromise> = [];
        let quoteSuggestion: boolean = false;
        for (let i = 0; i < results.length; i++) {
            const subPath: ParsePath = results[i];
            let rule: Rule = subPath.rule;
            let tokenText: string = subPath.value;
            if (subPath.path.length === maxDepth) {
                if (subPath.rule === EOF) {
                    // ignore the EOF and keep giving suggestions for the previous token
                    rule = subPath.path[subPath.path.length - 2].rule;
                    //set the token text to the text with '"' characters removed
                    const val: string = subPath.path[subPath.path.length - 2].value;
                    tokenText = val.slice(1, val.length - 1);
                }

                if (this.suggestions.get(subPath.rule)) {
                    tokenText = TRIM(tokenText).toLowerCase();
                    quoteSuggestion = true;
                    finalSuggestions.push(this.suggestions.get(subPath.rule)(tokenText, maxSuggestions / 2));
                } else {
                    quoteSuggestion = false;
                    finalSuggestions.push(new Promise((resolve, reject) => {
                        resolve([
                            REGEX_TO_STRING(this.terminals.get(rule))
                        ]);
                    }));
                }
            }
        }
        let query: any = null;
        if (maxParse.rule === EOF) {
            query = {};
        }
        return {
            path: maxParse,
            suggestions: finalSuggestions,
            query: query,
            isQuoted: quoteSuggestion
        }
    }

    getSuggestions(inputText: string, maxSuggestions: number = 15): Suggestion {
        const results = this.parse(inputText, ROOT);
        if (results.length == 0) return null;
        return this.buildSuggestionsFromParse(results, maxSuggestions);
    }
}


function buildQueryParser(): QueryParser {
    const expansions = DEFAULT_GRAMMAR.expansions;
    const terminals = DEFAULT_GRAMMAR.terminals;
    return new QueryParser(expansions, terminals, null);
}

export default buildQueryParser;