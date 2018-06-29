const _ = require("underscore");

type TokenType = string;
type TokenParseRule = RegExp;
type Rule = TokenType | Array<TokenType>;
type Grammar = Map<Rule, Array<Rule> | Rule>;
type Terminals = Map<Rule, TokenParseRule>;


const EOF: TokenType = 'EOF';
const ANY: TokenType = 'ANY';
const ALL: TokenType = 'ALL';
const ROOT: TokenType = 'ROOT';

const TRIM = (x: string): string => {
    return x.replace(/(^[ '\^\$\*#&]+)|([ '\^\$\*#&]+$)/g, '');
}

const DEFAULT_GRAMMAR: any = {
    tokens: {
        'TRAIT': '"(.+?)"',
        'GENE': '"(.+?)"',
        'INFLUENCING': 'influencing',
        'OF': 'of',
        'VARIANTS': 'variants',
        'GENE_T': 'gene',
        'TRAIT_T': 'trait',
        'NEAR': 'near',
        'IN': 'in',
        'PROMOTER': 'promoters',
        'ENHANCER': 'enhancers',
        'CELL_TYPE': '"(.+?)"'
    },
    grammar: {
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
    private grammar: Grammar;

    // tokens are terminal rules (Regular expressions)
    private terminals: Map<Rule, TokenParseRule>;
    // private suggestions: Map<Rule, Array<string>>;
    constructor(grammar: Grammar, terminals: Terminals, suggestions: Map<string, any>) {
        this.grammar = grammar;
        this.terminals = terminals;
        // this.suggestions = suggestions;
        this.terminals.forEach((v: any, k: string) => {

        })
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

    parse(soFar: string, rule: Rule, path: Array<ParsedToken>): Array<ParsePath> {
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
            // expand this rule
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
}