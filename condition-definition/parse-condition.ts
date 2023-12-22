/**
 * parse rule like 
 *   `(label1=1 and label2=2) or "label 1"=2 and ラベル<>3`
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
 *       }
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
  seqBy,
  eof,
} from './simple-parser';

type Label = string;
type Value = string;
type Eq = { eq: { label: Label, value: Value } };
type Neq = { neq: { label: Label, value: Value } };
type Unit = Eq | Neq;
type And = { and: Array<Unit | And | Or> };

type Or = { or: Array<Unit | And | Or> };
type Condition = Or | And | Unit;

const white = regParser(/\s*/);
const white_required = regParser(/\s+/);
const eq = quoted(white, stringParser('='), white);
const neq = quoted(white, stringParser('<>'), white);
const quote = stringParser('"');
const lParen = skipFirst(white, stringParser('('));
const rParen = skipFirst(white, stringParser(')'));
const and = quoted(or(white_required), stringParser('and'), or(white_required));
const or_ = quoted(or(white_required), stringParser('or'), or(white_required));

const simple_label = regParser(/[^=()<>\s\"]+/);
const quoted_label = quoted(quote, regParser(/[^"]*/), quote);
const label = or(quoted_label, simple_label);

const simple_value = regParser(/[^=()<>\s\"]+/);
const quoted_value = quoted(quote, regParser(/[^"]*/), quote);
const value = or(quoted_value, simple_value);

const eq_unit = map(seq(label, eq, value), ([label, _, value]) => ({ eq: { label, value } }));
const neq_unit = map(seq(label, neq, value), ([label, _, value]) => ({ neq: { label, value } }));
const base_unit = skipFirst(white, or<Unit>(eq_unit, neq_unit));

const and_unit = lazy<And>(() => map(assert(seqBy(or(parenthesized_unit, base_unit), and), res => res.length > 1, "should contains at least 2"), (units) => ({ and: units })));
const or_unit: Parser<Or> = lazy<Or>(() => map(assert(seqBy(or<Condition>(and_unit, parenthesized_unit, base_unit), or_), res => res.length > 1, "should contains at least 2"), (ands) => ({ or: ands })));
const parenthesized_unit: Parser<Condition> = lazy<Condition>(() => quoted(lParen, or<Condition>(parenthesized_unit, and_unit, or_unit, base_unit), rParen));
const unit: Parser<Condition> = lazy<Condition>(() => or<Condition>(or_unit, and_unit, base_unit));

const condition = quoted(white, unit, white);

const parseCondition = (input: string) => skipSecond(condition, eof)(input, 0);

export { parseCondition, type Condition, type And, type Or, type Unit, type Eq, type Neq, type Label, type Value };
export { base_unit, and_unit, or_unit, parenthesized_unit, unit, condition }