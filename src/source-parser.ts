/**
 * Simple parser for domain specific language(DSL) of dynamic form rule definition.
 *
 * parse rule like
 *  `
 *    (key1=1 or key2<>2) or
 *    key1="1 - 2" and key2<>1 or
 *    key3 in [1, 2, 3] or
 *    not key3 in ["4","5"] or
 *    anyOf(key4,key5,key6) in ["1","2","3"]
 *  `
 * to
 *   {
 *     type:"or",
 *     children:[
 *       {
 *         type: "or",
 *         children: [
 *           { type: "equals", key: "key1", value: "1" },
 *           { type: "notEquals", key: "key2", value: "2" }
 *         ]
 *       },
 *       {
 *         type: "and",
 *         children: [
 *           { type: "equals", key: "key1", value: "1 - 2" },
 *           { type: "notEquals", key: "key2", value: "1" },
 *         ]
 *       },
 *       { type: "in", key: "key3", value: ['1','2','3'] },
 *       {
 *         type: "not",
 *         child: { type: "in", key: "key3", value: ['4','5'] }
 *       },
 *      {
 *        type: "or",
 *        children: [
 *          { type: "in", key: "key4", value: ['1','2','3'] },
 *          { type: "in", key: "key5", value: ['1','2','3'] },
 *          { type: "in", key: "key5", value: ['1','2','3'] },
 *        ]
 *      }
 *     ]
 *   }
 */
import {
  type Parser,
  regexp,
  string,
  map,
  or,
  seq,
  skipFirst,
  skipSecond,
  lazy,
  assert,
  quoted,
  sepBy,
  eof,
  peak,
} from "./simple-parser";
import {
  type Rule,
  type And,
  type Or,
  type Unit,
  type Not,
  calcOperators,
  CalcOperator,
} from "./schema";

const sepByAtLeast = <T>(parser: Parser<T>, sep: Parser<unknown>, atLeast: number): Parser<T[]> =>
  assert(
    sepBy(parser, sep),
    (res) => res.length >= atLeast,
    `should contains at least ${atLeast} elements`,
  );

const white = regexp(/\s*/);
const whiteRequired = regexp(/\s+/);
const doubleQuote = string('"');
const singleQuote = string("'");
const lParen = skipFirst(white, string("("));
const rParen = skipFirst(white, string(")"));
const lSquare = skipFirst(white, string("["));
const rSquare = skipFirst(white, string("]"));
const comma = skipFirst(white, string(","));

const symbolOperator = (name: string) => skipFirst(white, string(name));
const textOperator = (name: string) =>
  peak(skipFirst(white, string(name)), or(whiteRequired, lParen, lSquare));

const and = textOperator("and");
const or_ = textOperator("or");
const not = textOperator("not");

const simpleKey = regexp(/[^,=()<>\s\"\'\]\[]+/);
const doubleQuotedKey = quoted(doubleQuote, regexp(/[^"]*/), doubleQuote);
const singleQuotedKey = quoted(singleQuote, regexp(/[^']*/), singleQuote);
const key = or(doubleQuotedKey, singleQuotedKey, simpleKey);

const params = skipFirst(
  white,
  quoted(lParen, sepBy(skipFirst(white, key), skipFirst(white, comma)), skipFirst(white, rParen)),
);
const keyOperator = skipFirst(white, or(string("anyOf"), string("allOf"), string("noneOf")));
const complexKey = map(seq(keyOperator, params), ([operator, keys]) => ({
  type: "complexKey" as const,
  operator,
  keys,
}));

const simpleValue = regexp(/[^,=()<>\s\"\'\]\[\]]+/);
const doubleQuotedValue = quoted(doubleQuote, regexp(/[^"]*/), doubleQuote);
const singleQuotedValue = quoted(singleQuote, regexp(/[^']*/), singleQuote);
const value = skipFirst(white, or(doubleQuotedValue, singleQuotedValue, simpleValue));

const array = skipFirst(white, quoted(lSquare, sepBy(value, comma), rSquare));

const operatorDict = {
  equals: { mark: "=", value: value },
  notEquals: { mark: "<>", value: value },
  in: { mark: "in", value: array },
  notIn: { mark: "notIn", value: array },
  includes: { mark: "includes", value: value },
  notIncludes: { mark: "notIncludes", value: value },
  matches: { mark: "matches", value: value },
  notMatches: { mark: "notMatches", value: value },
} as const satisfies Record<CalcOperator, { mark: string; value: Parser<string | string[]> }>;
const isSymbolOperator = (operator: string) => !/[a-zA-Z0-9]/.test(operator);

const makeOperatorUnit = <T extends CalcOperator>(operator: T) => {
  const { mark, value } = operatorDict[operator];
  const operatorParser = isSymbolOperator(mark) ? symbolOperator(mark) : textOperator(mark);
  return map(seq(key, operatorParser, value), ([key, _, value]) => ({
    type: operator as T,
    key,
    value: value as (typeof operatorDict)[T]["value"] extends Parser<infer R> ? R : never,
  }));
};
const operatorUnit = or(...calcOperators.map(makeOperatorUnit)) as Parser<Unit>;

const makeComplexOperatorUnit = <T extends CalcOperator>(operator: T) => {
  const { mark, value } = operatorDict[operator];
  const operatorParser = isSymbolOperator(mark) ? symbolOperator(mark) : textOperator(mark);
  return map(seq(complexKey, operatorParser, value), ([key, _, value]) => {
    const keys = key.keys;
    const complexOperator = { anyOf: "or", allOf: "and", noneOf: "or" }[key.operator];
    const children = keys.map((key) => ({
      type: operator as T,
      key,
      value: value as (typeof operatorDict)[T]["value"] extends Parser<infer R> ? R : never,
    }));
    const complexResult = {
      type: complexOperator,
      children,
    };
    if (key.operator === "noneOf") {
      return {
        type: "not",
        child: complexResult,
      };
    }
    return complexResult;
  });
};
const complexOperatorUnit = or(...calcOperators.map(makeComplexOperatorUnit)) as Parser<Unit>;

const notUnit = lazy<Not>(() =>
  map(seq(not, white, or(complexOperatorUnit, operatorUnit, parenthesizedUnit)), ([, , unit]) => ({
    type: "not" as const,
    child: unit,
  })),
);
const baseUnit = skipFirst(white, or<Unit>(complexOperatorUnit, operatorUnit, notUnit));
const andUnit = lazy<And>(() =>
  map(skipFirst(white, sepByAtLeast(or(parenthesizedUnit, baseUnit), and, 2)), (units) => ({
    type: "and" as const,
    children: units,
  })),
);
const orUnit: Parser<Or> = lazy<Or>(() =>
  map(sepByAtLeast(or<Rule>(andUnit, parenthesizedUnit, baseUnit), or_, 2), (ands) => ({
    type: "or" as const,
    children: ands,
  })),
);
const parenthesizedUnit: Parser<Rule> = lazy<Rule>(() =>
  quoted(lParen, or<Rule>(parenthesizedUnit, andUnit, orUnit, baseUnit), rParen),
);

const unit: Parser<Rule> = lazy<Rule>(() => or<Rule>(orUnit, andUnit, baseUnit, parenthesizedUnit));

const condition: Parser<Rule> = quoted(white, unit, white);

const safeParseSource = (input: string) => skipSecond(condition, eof())(input, 0);

export { safeParseSource, calcOperators, type Rule as Condition };
export { baseUnit, andUnit, orUnit, unit, condition, complexKey };
