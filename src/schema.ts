/**
 * @file This file contains the schema definition and related types for parsing and validating rules.
 * It defines schema validators, recursive schemas, rule types, operators, and a safe parsing function.
 * The file also exports the necessary types and functions for working with rules.
 *
 * @example
 * // Import the necessary types and functions
 * import { Rule, safeParseObject } from './schema';
 *
 * // Define a rule object
 * const ruleObject = {
 *   type: 'and',
 *   children: [
 *     { type: 'equals', key: 'name', value: 'John' },
 *     { type: 'notEquals', key: 'age', value: '30' }
 *   ]
 * };
 *
 * // Parse the rule object
 * const result = safeParseObject(ruleObject);
 * if (result.ok) {
 *   const rule: Rule = result.value;
 *   // Use the parsed rule for further processing
 * } else {
 *   const errors: v.Issue[] = result.error;
 *   // Handle the parsing errors
 * }
 */

import * as v from "valibot";

// Define schema validators
const key = v.string();
const value = v.string();
const equals = v.object({ type: v.literal("equals"), key, value });
const notEquals = v.object({ type: v.literal("notEquals"), key, value });
const in_ = v.object({ type: v.literal("in"), key, value: v.array(value) });
const notIn = v.object({ type: v.literal("notIn"), key, value: v.array(value) });
const includes = v.object({ type: v.literal("includes"), key, value });
const notIncludes = v.object({ type: v.literal("notIncludes"), key, value });
const matches = v.object({ type: v.literal("matches"), key, value });
const notMatches = v.object({ type: v.literal("notMatches"), key, value });

// Define recursive schemas
const not: v.BaseSchema<Not> = v.object({
  type: v.literal("not"),
  child: v.union([v.recursive(() => unit), v.recursive(() => and), v.recursive(() => or)]),
});
const unit = v.union([
  equals,
  notEquals,
  in_,
  notIn,
  includes,
  notIncludes,
  matches,
  notMatches,
  not,
]);
const and: v.BaseSchema<And> = v.object({
  type: v.literal("and"),
  children: v.array(v.union([unit, v.recursive(() => and), v.recursive(() => or)])),
});
const or: v.BaseSchema<Or> = v.object({
  type: v.literal("or"),
  children: v.array(v.union([unit, v.recursive(() => and), v.recursive(() => or)])),
});
const rule = v.union([and, or, unit]);

// Define types based on schema outputs
type Key = v.Output<typeof key>;
type Value = v.Output<typeof value>;
type Equals = v.Output<typeof equals>;
type NotEquals = v.Output<typeof notEquals>;
type In = v.Output<typeof in_>;
type NotIn = v.Output<typeof notIn>;
type Includes = v.Output<typeof includes>;
type NotIncludes = v.Output<typeof notIncludes>;
type Matches = v.Output<typeof matches>;
type NotMatches = v.Output<typeof notMatches>;
type Unit = v.Output<typeof unit>;

// Define rule types
type Not = { type: "not"; child: Unit | And | Or };
type And = { type: "and"; children: ReadonlyArray<Unit | And | Or> };
type Or = { type: "or"; children: ReadonlyArray<Unit | And | Or> };
type Rule = Readonly<v.Output<typeof rule>>;

// Define operators
const calcOperators = [
  "in",
  "notIn",
  "includes",
  "notIncludes",
  "matches",
  "notMatches",
  "equals",
  "notEquals",
] as const;
const operators = ["and", "or", "not", ...calcOperators] as const;
type Operator = (typeof operators)[number];
type CalcOperator = (typeof calcOperators)[number];

/**
 * Represents the result of parsing an object into a rule.
 */
type SafeParseObjectResult =
  | {
      ok: true;
      value: Rule;
    }
  | {
      ok: false;
      error: v.Issue[];
    };

/**
 * Safely parses an unknown object into a rule.
 * @param input The object to parse.
 * @returns The result of the parsing operation.
 */
const safeParseObject = (input: unknown): SafeParseObjectResult => {
  const res = v.safeParse(rule, input);
  const { success: ok } = res;
  return ok ? { ok, value: res.output } : { ok, error: res.issues };
};

export {
  type Key,
  type Value,
  type Equals as Eq,
  type NotEquals as Neq,
  type In,
  type NotIn,
  type Includes,
  type NotIncludes,
  type Matches,
  type NotMatches,
  type Unit,
  type And,
  type Or,
  type Not,
  type Rule,
  type SafeParseObjectResult,
  type Operator,
  type CalcOperator,
  calcOperators,
  safeParseObject,
};
