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
  regParser,
  stringParser,
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
} from './simple-parser';

type Label = string;
type Value = string;
type Eq = { eq: { label: Label, value: Value } };
type Neq = { neq: { label: Label, value: Value } };
type In = { in: { label: Label, value: Array<Value> } };
type Includes = { includes: { label: Label, value: Value } };
type NotIncludes = { notIncludes: { label: Label, value: Value } };
type Matches = { matches: { label: Label, value: Value } };
type Unit = Eq | Neq | In | Includes | NotIncludes | Matches;
type And = { and: Array<Unit | And | Or> };

type Or = { or: Array<Unit | And | Or> };
type Condition = Or | And | Unit;

const calcOperators = ['in', 'includes', 'notIncludes', 'matches', 'eq', 'neq'] as const;

const sepByAtLeast = <T>(parser: Parser<T>, sep: Parser<unknown>, atLeast: number): Parser<T[]> =>
  assert(sepBy(parser, sep), res => res.length >= atLeast, `should contains at least ${atLeast} elements`);

const white = regParser(/\s*/);
const white_required = regParser(/\s+/);
const eq = quoted(white, stringParser('='), white);
const neq = quoted(white, stringParser('<>'), white);
const quote = stringParser('"');
const lParen = skipFirst(white, stringParser('('));
const rParen = skipFirst(white, stringParser(')'));
const lSquare = skipFirst(white, stringParser('['));
const rSquare = skipFirst(white, stringParser(']'));
const comma = skipFirst(white, stringParser(','));

const and = peak(skipFirst(white, stringParser('and')), or(white_required, lParen));
const or_ = peak(skipFirst(white, stringParser('or')), or(white_required, lParen));
const in_ = peak(skipFirst(white, stringParser('in')), or(white_required, lParen));
const includes = peak(skipFirst(white, stringParser('includes')), or(white_required, lParen));
const notIncludes = peak(skipFirst(white, stringParser('notIncludes')), or(white_required, lParen));
const matches = peak(skipFirst(white, stringParser('matches')), or(white_required, lParen));

const simple_label = regParser(/[^,=()<>\s\"\']+/);
const double_quoted_label = quoted(quote, regParser(/[^"]*/), quote);
const single_quoted_label = quoted(stringParser("'"), regParser(/[^']*/), stringParser("'"));
const label = or(double_quoted_label, single_quoted_label, simple_label);

const simple_value = regParser(/[^,=()<>\s\"\']+/);
const double_quoted_value = quoted(quote, regParser(/[^"]*/), quote);
const single_quoted_value = quoted(stringParser("'"), regParser(/[^']*/), stringParser("'"));
const value = skipFirst(white, or(double_quoted_value, single_quoted_value, simple_value));

const array = quoted(lSquare, sepBy(value, comma), rSquare);

const eq_unit = map(seq(label, eq, value), ([label, _, value]) => ({ eq: { label, value } }));
const neq_unit = map(seq(label, neq, value), ([label, _, value]) => ({ neq: { label, value } }));
const in_array_unit = map(seq(label, in_, array), ([label, _, value]) => ({ in: { label, value } }));
const includes_unit = map(seq(label, includes, value), ([label, _, value]) => ({ includes: { label, value } }));
const notIncludes_unit = map(seq(label, notIncludes, value), ([label, _, value]) => ({ notIncludes: { label, value } }));
const matches_unit = map(seq(label, matches, value), ([label, _, value]) => ({ matches: { label, value } }));
const base_unit = skipFirst(white, or<Unit>(in_array_unit, eq_unit, neq_unit, includes_unit, notIncludes_unit, matches_unit));

const and_unit = lazy<And>(() => map(sepByAtLeast(or(parenthesized_unit, base_unit), and, 2), (units) => ({ and: units })));
const or_unit: Parser<Or> = lazy<Or>(() => map(sepByAtLeast(or<Condition>(and_unit, parenthesized_unit, base_unit), or_, 2), (ands) => ({ or: ands })));
const parenthesized_unit: Parser<Condition> = lazy<Condition>(() => quoted(lParen, or<Condition>(parenthesized_unit, and_unit, or_unit, base_unit), rParen));
const unit: Parser<Condition> = lazy<Condition>(() => or<Condition>(or_unit, and_unit, base_unit));

const condition = quoted(white, unit, white);

const parseCondition = (input: string) => skipSecond(condition, eof())(input, 0);


export { parseCondition, calcOperators, type Condition, type And, type Or, type Unit, type Eq, type Neq, type Label, type Value };
export { base_unit, and_unit, or_unit, parenthesized_unit, in_array_unit, unit, condition, array }