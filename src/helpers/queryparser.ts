const _ = require("underscore");

type Rule = TokenType | Array<TokenType>;
type Grammar = Map<Rule, Array<Rule> | Rule>;
type Terminals = Map<Rule, string>;

type TokenType = string;
type TokenParseRule = string;
const EOF: TokenType = 'EOF';
const ANY: TokenType = 'ANY';
const ALL: TokenType = 'ALL';
const ROOT: TokenType = 'ROOT';



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


export class ParsePath {
    public rule: Rule;
    public value: any;
    public path: Array<any>;
    public isTerminal: boolean;
    constructor(rule: Rule, value: string, path: Array<any>, isTerminal: boolean) {
        this.rule = rule;
        this.value = value;
        this.path = path;
        this.isTerminal = isTerminal;
    }
}

export class Token {
    public rule: Rule;
    public value: string;
    constructor(rule: Rule, value: string) {
        this.rule = rule;
        this.value = value;
    }
}

export class QueryParser {
    // grammar elements are expansions 
    private grammar: Grammar;

    // tokens are terminal rules (Regular expressions)
    private tokens: Map<Rule, TokenParseRule>;
    private suggestions: Map<Rule, Array<string>>;
    constructor(grammar: Grammar, tokens: Terminals, suggestions: Map<string, any>) {
        this.grammar = grammar;
        this.tokens = tokens;
        this.suggestions = suggestions;
        this.tokens.forEach((v: any, k: string) => {

        })
    }

    eat(soFar: string, rule: Rule): { parsed: string, rest: string } {
        // soFar.trim() in python
        soFar = soFar.replace(/(^[ '\^\$\*#&]+)|([ '\^\$\*#&]+$)/g, '');
        //soFarLowerCase = soFar.toLowerCase();

        // m = self.patterns[rule].match(so_far.lower())
        // if m is not None:
        // # if there is  match append the match to each path
        // val, offset = m.group(), m.end()
        // return so_far[: offset], so_far[offset:]
        // return None, so_far
        return { parsed: '', rest: '' };
    }

    parse(soFar: string, rule: Rule, path: Array<Token>): Array<ParsePath> {
        if (rule === EOF && soFar.length === 0) {
            const newPath = path.slice(0);
            newPath.push(new Token(EOF, ''));
            return [new ParsePath(rule, soFar, newPath, true)];
        } else if (this.tokens.get(rule) !== undefined) {
            const parsed = this.eat(soFar, rule).parsed;
            if (parsed !== null) {
                const pathCopy = path.slice(0);
                pathCopy.push(new Token(rule, parsed));
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
            //const maxParse: ParsePath = new ParsePath;
            const maxDepth: number = null;
            const paths: Array<ParsePath> = [];
            tryParseResults.forEach((result) => {
                if (result.path.length === maxDepth) {
                    if (result.isTerminal) {

                    } else {
                        paths.push(new ParsePath(result.rule, result.value, result.path, result.isTerminal))
                    }
                }
            });
            return paths;
            // try_parse_results = self.parse(so_far, self.grammar[rule[1]], path[:])
            //     max_parse = max(try_parse_results, key=lambda x : len(x.path))
            //     max_depth = len(max_parse.path)
            //     paths = []
            //     for token, token_text, sub_path, is_terminal in try_parse_results:
            //         if len(sub_path) != max_depth:
            //             continue
            //         if (is_terminal):
            //             # go to the next parse path (rule[2]) and add results:
            //             parsed = ' ' .join([x.value for x in sub_path[len(path):]]).strip()
            //             cleaned_so_far = so_far.strip()
            //             idx_to = cleaned_so_far.index(parsed)
            //             rest = cleaned_so_far[idx_to + len(parsed):]
            //             if (len(rule[2:]) == 0):
            //                 paths.append(ParsePath(token, token_text, path, is_terminal))
            //             if (len(rule[2:]) == 1):
            //                 return self.parse(rest, rule[2], sub_path[:])
            //             else:
            //                 return self.parse(rest, [ALL] + rule[2:], sub_path[:])
            //         else:
            //             paths.append(ParsePath(token, token_text, sub_path, is_terminal))

            //     return paths
        }
        return [];

    }

/*import json
import re
from functools import lru_cache
from sirius.query.QueryTree import QueryTree
from sirius.helpers.loaddata import loaded_gene_names, loaded_trait_names, loaded_cell_types
from sirius.core.utilities import HashableDict
from sirius.core.searchindex import SearchIndex
from collections import namedtuple

ParsePath = namedtuple('ParsePath', ['rule', 'value', 'path', 'is_terminal'])
Token = namedtuple('Token', ['rule', 'value'])

EOF = 'EOF'
ANY = 'ANY'
ALL = 'ALL'
ROOT = 'ROOT'

class QueryParser:
    def __init__(self, grammar, tokens, suggestions):
        self.grammar = grammar
        self.tokens = tokens
        self.patterns = {}
        for token in self.tokens.keys():
            p = self.tokens[token]
            self.patterns[token] = re.compile(p)
        self.suggestions = {}
        for key in suggestions.keys():
            data = {}
            for idx, suggestion in enumerate(suggestions[key]):
                data[idx] = { 'text': suggestion, 'id' : idx }
            self.suggestions[key] = SearchIndex(data, 'text')

    def build_variant_query(self, parse_path):
        token = parse_path[0]
        q = None
        if token.rule == 'INFLUENCING':
            trait_name = parse_path[1].value[1:-1]
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
                      "$text": trait_name
                    },
                    "toEdges": [

                    ]
                  }
                }
              ],
              "limit": 10000000
            }

    def build_trait_query(self, parse_path):
        trait_name = parse_path[0].value[1:-1]
        return {"type":"InfoNode","filters":{"type":"trait","$text": trait_name},"toEdges":[],"limit":150}

    def build_gene_query(self, parse_path):
        gene_name = parse_path[0].value[1:-1]
        return {"type":"GenomeNode","filters":{"type":"gene","name": gene_name},"toEdges":[],"limit":150}

    def build_cell_query(self, parse_path):
        cell_type = parse_path[2].value[1:-1]
        if(parse_path[0].rule == 'PROMOTER'):
            annotation_type = "Promoter-like"
        else:
            annotation_type = "Enhancer-like"
        return {
            "type": "GenomeNode",
            "filters": {
                "type": annotation_type,
                "info.biosample": cell_type
            },
            "toEdges": [],
            "arithmetics": [],
            "limit": 2000000
        }

    def build_query(self, parse_path):
        token = parse_path[0]
        if token.rule == 'VARIANTS':
            return self.build_variant_query(parse_path[1:])
        elif token.rule == 'GENE_T':
            return self.build_gene_query(parse_path[1:])
        elif token.rule == 'TRAIT_T':
            return self.build_trait_query(parse_path[1:])
        elif token.rule == 'PROMOTER' or token.rule == 'ENHANCER':
            return self.build_cell_query(parse_path)

    def get_suggestions(self, input_text, max_suggestions=15):
        results = self.parse(input_text, self.grammar[ROOT])
        if (len(results) == 0) :
            return []
        return self.build_suggestions_from_parse(results, max_suggestions)
    
    def build_suggestions_from_parse(self, results, max_suggestions=15):
        max_parse = max(results, key=lambda x : len(x.path))
        max_depth = len(max_parse.path)
        final_suggestions = []
        quoted_suggestion = False
        for token, token_text, path, is_terminal in [x for x in results]:
            if len(path) != max_depth:
                continue
            if token == EOF:
                # ignore the EOF and keep giving suggestions for the previous token
                token = path[-2].rule
                # set the token text to the text with '"' characters removed
                token_text = path[-2].value[1:-1]
            if token in self.suggestions:
                token_text = token_text.strip().lower()
                # try doing a prefix match with the remainder
                final_suggestions += self.suggestions[token].get_results(token_text, int(max_suggestions/2))
                if len(final_suggestions) >= max_suggestions:
                    break
                quoted_suggestion = True
            else:
                # just return the token string
                quoted_suggestion = False
                final_suggestions.append(self.tokens[token])
                if len(final_suggestions) >= max_suggestions:
                    break
        query = None
        if max_parse.rule == EOF:
            query = self.build_query(max_parse.path)
        paths_to_return = [result.path for result in results if len(result.path) == max_depth]
        return paths_to_return[0], final_suggestions, query, quoted_suggestion

    def eat(self, so_far, rule):
        so_far = so_far.strip()
        m = self.patterns[rule].match(so_far.lower())
        if m is not None:
            # if there is  match append the match to each path
            val, offset = m.group(), m.end()
            return so_far[:offset], so_far[offset:]
        return None, so_far

    def parse(self, so_far, rule, path=[]):
        """
            This function recursively walks the grammar to generate all possible parse paths.
            The paths are returned to be ranked and returned as autocomplete suggestions
        """
        if (rule == EOF and len(so_far) == 0):
            new_path = path[:]
            new_path.append(Token(EOF, ''))
            return [ParsePath(rule, so_far, new_path, True)]
        if (isinstance(rule, str) and rule in self.tokens):
            parsed, rest = self.eat(so_far, rule)
            if parsed != None:
                path_copy = path[:]
                path_copy.append(Token(rule, parsed))
                return [ParsePath(rule, parsed, path_copy, True)]
            else:
                return [ParsePath(rule, so_far, path[:], False)]
        if (isinstance(rule, str) and rule in self.grammar):
            return self.parse(so_far, self.grammar[rule], path[:])
        elif (rule[0] == ANY):
            # just union all possible parse paths together
            possibilities = []
            for sub_rule in rule[1:]:
                possibilities += self.parse(so_far, sub_rule, path[:])
            return possibilities
        elif (rule[0] == ALL):
            if (rule[1] in self.tokens):
                # check if we can eat part of the input
                parsed, rest = self.eat(so_far, rule[1])
                new_path = path[:]
                new_path.append(Token(rule[1], parsed))
                if rest == so_far or parsed == None:
                    # we were not able to eat a token! return suggestions for the current token rule
                    return self.parse(so_far, rule[1], path[:])
                else:
                    # we were able to eat a token! return suggestions for the remainder
                    if (len(rule[2:]) == 0):
                        return []
                    if (len(rule[2:]) == 1):
                        return self.parse(rest, rule[2], new_path)
                    else:
                        return self.parse(rest, [ALL] + rule[2:], new_path)
            elif (rule[1] in self.grammar):
                try_parse_results = self.parse(so_far, self.grammar[rule[1]], path[:])
                max_parse = max(try_parse_results, key=lambda x : len(x.path))
                max_depth = len(max_parse.path)
                paths = []
                for token, token_text, sub_path, is_terminal in try_parse_results:
                    if len(sub_path) != max_depth:
                        continue
                    if (is_terminal):
                        # go to the next parse path (rule[2]) and add results:
                        parsed = ' ' .join([x.value for x in sub_path[len(path):]]).strip()
                        cleaned_so_far = so_far.strip()
                        idx_to = cleaned_so_far.index(parsed)
                        rest = cleaned_so_far[idx_to + len(parsed):]
                        if (len(rule[2:]) == 0):
                            paths.append(ParsePath(token, token_text, path, is_terminal))
                        if (len(rule[2:]) == 1):
                            return self.parse(rest, rule[2], sub_path[:])
                        else:
                            return self.parse(rest, [ALL] + rule[2:], sub_path[:])
                    else:
                        paths.append(ParsePath(token, token_text, sub_path, is_terminal))
                
                return paths
                
        return []


def get_default_parser_settings():
    tokens = {
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
    }

    grammar = {
        'VARIANT_QUERY': [ALL, 'VARIANTS', 'INFLUENCING', 'TRAIT',  EOF],
        'GENE_QUERY' : [ALL, 'GENE_T', 'GENE', EOF],
        'ANNOTATION_TYPE': [ANY, 'PROMOTER', 'ENHANCER'],
        'CELL_ANNOTATION' : [ALL,  'ANNOTATION_TYPE', 'IN', 'CELL_TYPE'],
        'ANNOTATION_QUERY' : [ALL, 'CELL_ANNOTATION', EOF],
        'TRAIT_QUERY' : [ALL, 'TRAIT_T', 'TRAIT', EOF],
        'ROOT': [ANY, 'VARIANT_QUERY', 'GENE_QUERY', 'TRAIT_QUERY', 'ANNOTATION_QUERY']
    }

    return tokens, grammar

@lru_cache(maxsize=1)
def load_suggestions():
    return {
        'GENE': loaded_gene_names,
        'TRAIT': loaded_trait_names,
        'CELL_TYPE': loaded_cell_types,
        'ANNOTATION_TYPE': ['promoters', 'enhancers'],
    }

@lru_cache(maxsize=1)
def build_parser(suggestions=None):
    tokens, grammar = get_default_parser_settings()
    if suggestions == None:
        suggestions =  load_suggestions()
    return QueryParser(grammar, tokens, suggestions)

def get_suggestions(search_text):
    p = build_parser()
    tokens, suggestions, query, quoted_suggestion = p.get_suggestions(search_text)
    return {
        "tokens": tokens,
        "suggestions": suggestions,
        "query": query,
        "quoted_suggestion": quoted_suggestion,
    }

if __name__ == "__main__":
    print("Testing grammar")
    while(True):
        genes = ['MAOA', 'MAOB', 'PCSK9', 'NF2']
        traits = ['Cancer', 'Alzheimers', 'Depression']
        suggestions = {
            'GENE': genes,
            'TRAIT': traits,
            'CELL_TYPE': ['liver cells', 'lung cells', 'heart cells'],
            'ANNOTATION_TYPE': ['promoters', 'enhancers'],
        }
        p = build_parser(HashableDict(suggestions))
        text = input("Enter a search:")
        result = p.get_suggestions(text)
        print(result)
*/