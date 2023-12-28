/**
 * parse rule like
 *  `
 *    (key1=1 or key2<>2) or
 *    key1="1 - 2" and key2<>1 or
 *    label3 in [1, 2, 3] or
 *    not key3 in ["4","5"]
 *  `
 * to
 *   {
 *     type:"or",
 *     items:[
 *       {
 *         type: "or",
 *         items: [
 *           { type: "equals", key: "key1", value: "1" },
 *           { type: "notEquals", key: "key2", value: "2" }
 *         ]
 *       },
 *       {
 *         type: "and",
 *         items: [
 *           { type: "equals", key: "key1", value: "1 - 2" },
 *           { type: "notEquals", key: "key2", value: "1" },
 *         ]
 *       },
 *       { type: "in", key: "key3", value: ['1','2','3'] },
 *       {
 *         type: "not",
 *         item: { type: "in", key: "key3", value: ['4','5'] }
 *       }
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
import { type Condition, type And, type Or, type Unit, type Not, calcOperators } from "./schema";
import { openInEditor } from "bun";

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
const equals = skipFirst(white, string("="));
const notEquals = skipFirst(white, string("<>"));
const lParen = skipFirst(white, string("("));
const rParen = skipFirst(white, string(")"));
const lSquare = skipFirst(white, string("["));
const rSquare = skipFirst(white, string("]"));
const comma = skipFirst(white, string(","));

const operator = (name: string) => peak(skipFirst(white, string(name)), or(whiteRequired, lParen));
const and = operator("and");
const or_ = operator("or");
const in_ = operator("in");
const notIn = operator("notIn");
const includes = operator("includes");
const notIncludes = operator("notIncludes");
const matches = operator("matches");
const notMatches = operator("notMatches");
const not = operator("not");

const simpleKey = regexp(/[^,=()<>\s\"\']+/);
const doubleQuotedKey = quoted(doubleQuote, regexp(/[^"]*/), doubleQuote);
const singleQuotedKey = quoted(singleQuote, regexp(/[^']*/), singleQuote);
const key = or(doubleQuotedKey, singleQuotedKey, simpleKey);

const simpleValue = regexp(/[^,=()<>\s\"\']+/);
const doubleQuotedValue = quoted(doubleQuote, regexp(/[^"]*/), doubleQuote);
const singleQuotedValue = quoted(singleQuote, regexp(/[^']*/), singleQuote);
const value = skipFirst(white, or(doubleQuotedValue, singleQuotedValue, simpleValue));

const array = quoted(lSquare, sepBy(value, comma), rSquare);

const equalsUnit = map(seq(key, equals, value), ([label, _, value]) => ({
  type: "equals" as const,
  label,
  value,
}));
const notEqualsUnit = map(seq(key, notEquals, value), ([label, _, value]) => ({
  type: "notEquals" as const,
  label,
  value,
}));
const inUnit = map(seq(key, in_, array), ([label, _, value]) => ({
  type: "in" as const,
  label,
  value,
}));
const notInUnit = map(seq(key, notIn, array), ([label, _, value]) => ({
  type: "notIn" as const,
  label,
  value,
}));
const includesUnit = map(seq(key, includes, value), ([label, _, value]) => ({
  type: "includes" as const,
  label,
  value,
}));
const notIncludesUnit = map(seq(key, notIncludes, value), ([label, _, value]) => ({
  type: "notIncludes" as const,
  label,
  value,
}));
const matchesUnit = map(seq(key, matches, value), ([label, _, value]) => ({
  type: "matches" as const,
  label,
  value,
}));
const notMatchesUnit = map(seq(key, notMatches, value), ([label, _, value]) => ({
  type: "notMatches" as const,
  label,
  value,
}));
const basicUnit = [
  inUnit,
  notInUnit,
  equalsUnit,
  notEqualsUnit,
  includesUnit,
  notIncludesUnit,
  matchesUnit,
  notMatchesUnit,
];
const notUnit = lazy<Not>(()=>map(
  seq(
    not,
    unit,
  ),
  ([_, unit]) => ({
    type: "not" as const,
    child: or(
      ...basicUnit,
      lazy(() => andUnit),
      lazy(() => orUnit),
      unit,
    ),
  }),
));
const baseUnit = skipFirst(white, or<Unit>(...basicUnit, notUnit));
const andUnit = lazy<And>(() =>
  map(sepByAtLeast(or(parenthesizedUnit, baseUnit), and, 2), (units) => ({
    type: "and" as const,
    children: units,
  })),
);
const orUnit: Parser<Or> = lazy<Or>(() =>
  map(sepByAtLeast(or<Unit>(andUnit, parenthesizedUnit, baseUnit), or_, 2), (ands) => ({
    type: "or" as const,
    children: ands,
  })),
);
const parenthesizedUnit: Parser<Condition> = lazy<Condition>(() =>
  quoted(lParen, or<Condition>(parenthesizedUnit, andUnit, orUnit, baseUnit), rParen),
);
const parenthesized_unit: Parser<Condition> = lazy<Condition>(() =>
  quoted(lParen, or<Condition>(parenthesized_unit, and_unit, or_unit, base_unit), rParen),
);
const unit: Parser<Condition> = lazy<Condition>(() => or<Condition>(or_unit, and_unit, base_unit));

const condition = quoted(white, unit, white);

const parseCondition = (input: string) => skipSecond(condition, eof())(input, 0);

export { parseCondition, calcOperators, type Condition };
export { base_unit, and_unit, or_unit, parenthesized_unit, in_array_unit, unit, condition, array };
