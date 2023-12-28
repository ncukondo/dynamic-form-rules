/**
 * parse rule like
 *   `(label1=1 and label2=2) or "label 1"=2 and ラベル<>3 or label3 in ["1", "2", "3"]`
 * to
 *   {
 *    or: [
 *      {
 *        and: [
 *          { eq: { label: 'label1', value: '1' } },
 *          { eq: { label: 'label2', value: '2' } }
 *        ]
 *      },
 *      {
 *        and: [
 *          { eq: { label: 'label 1', value: '2' } },
 *          { neq: { label: 'ラベル', value: '3' } }
 *        ]
 *       },
 *      {
 *        { in: { label: 'label3', value: ['1', '2', '3'] } },
 *      }
 *    ]
 *  }
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
import { type Condition, type And, type Or, type Unit, calcOperators } from "./schema";

const sepByAtLeast = <T>(parser: Parser<T>, sep: Parser<unknown>, atLeast: number): Parser<T[]> =>
  assert(
    sepBy(parser, sep),
    (res) => res.length >= atLeast,
    `should contains at least ${atLeast} elements`,
  );

const white = regexp(/\s*/);
const whiteRequired = regexp(/\s+/);
const eq = quoted(white, string("="), white);
const neq = quoted(white, string("<>"), white);
const doubleQuote = string('"');
const singleQuote = string("'");
const lParen = skipFirst(white, string("("));
const rParen = skipFirst(white, string(")"));
const lSquare = skipFirst(white, string("["));
const rSquare = skipFirst(white, string("]"));
const comma = skipFirst(white, string(","));

const and = peak(skipFirst(white, string("and")), or(whiteRequired, lParen));
const or_ = peak(skipFirst(white, string("or")), or(whiteRequired, lParen));
const in_ = peak(skipFirst(white, string("in")), or(whiteRequired, lParen));
const includes = peak(skipFirst(white, string("includes")), or(whiteRequired, lParen));
const notIncludes = peak(skipFirst(white, string("notIncludes")), or(whiteRequired, lParen));
const matches = peak(skipFirst(white, string("matches")), or(whiteRequired, lParen));

const simpleLabel = regexp(/[^,=()<>\s\"\']+/);
const doubleQuotedLabel = quoted(doubleQuote, regexp(/[^"]*/), doubleQuote);
const singleQuotedLabel = quoted(singleQuote, regexp(/[^']*/), singleQuote);
const label = or(doubleQuotedLabel, singleQuotedLabel, simpleLabel);

const simple_value = regexp(/[^,=()<>\s\"\']+/);
const doubleQuotedValue = quoted(doubleQuote, regexp(/[^"]*/), doubleQuote);
const singleQuotedValue = quoted(singleQuote, regexp(/[^']*/), singleQuote);
const value = skipFirst(white, or(doubleQuotedValue, singleQuotedValue, simple_value));

const array = quoted(lSquare, sepBy(value, comma), rSquare);

const eq_unit = map(seq(label, eq, value), ([label, _, value]) => ({
  eq: { label, value },
}));
const neq_unit = map(seq(label, neq, value), ([label, _, value]) => ({
  neq: { label, value },
}));
const in_array_unit = map(seq(label, in_, array), ([label, _, value]) => ({
  in: { label, value },
}));
const includes_unit = map(seq(label, includes, value), ([label, _, value]) => ({
  includes: { label, value },
}));
const notIncludes_unit = map(seq(label, notIncludes, value), ([label, _, value]) => ({
  notIncludes: { label, value },
}));
const matches_unit = map(seq(label, matches, value), ([label, _, value]) => ({
  matches: { label, value },
}));
const base_unit = skipFirst(
  white,
  or<Unit>(in_array_unit, eq_unit, neq_unit, includes_unit, notIncludes_unit, matches_unit),
);

const and_unit = lazy<And>(() =>
  map(sepByAtLeast(or(parenthesized_unit, base_unit), and, 2), (units) => ({
    and: units,
  })),
);
const or_unit: Parser<Or> = lazy<Or>(() =>
  map(sepByAtLeast(or<Condition>(and_unit, parenthesized_unit, base_unit), or_, 2), (ands) => ({
    or: ands,
  })),
);
const parenthesized_unit: Parser<Condition> = lazy<Condition>(() =>
  quoted(lParen, or<Condition>(parenthesized_unit, and_unit, or_unit, base_unit), rParen),
);
const unit: Parser<Condition> = lazy<Condition>(() => or<Condition>(or_unit, and_unit, base_unit));

const condition = quoted(white, unit, white);

const parseCondition = (input: string) => skipSecond(condition, eof())(input, 0);

export { parseCondition, calcOperators, type Condition };
export { base_unit, and_unit, or_unit, parenthesized_unit, in_array_unit, unit, condition, array };
