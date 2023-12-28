import { z } from "zod";

const label = z.string();
const value = z.string();
const labelValue = z.object({ label, value });
const labelArrayValue = z.object({ label, value: z.array(value) });
const eq = z.object({ eq: labelValue });
const neq = z.object({ neq: labelValue });
const in_ = z.object({ in: labelArrayValue });
const notIn = z.object({ notIn: labelArrayValue });
const includes = z.object({ includes: labelValue });
const notIncludes = z.object({ notIncludes: labelValue });
const matches = z.object({ matches: labelValue });
const notMatches = z.object({ notMatches: labelValue });
const unit = z.union([eq, neq, in_, notIn, includes, notIncludes, matches, notMatches]);

const and: z.ZodType<And> = z.object({
  and: z.array(z.union([unit, z.lazy(() => and), z.lazy(() => or)])),
});
const or: z.ZodType<Or> = z.object({
  or: z.array(z.union([unit, z.lazy(() => and), z.lazy(() => or)])),
});
const condition = z.union([and, or, unit]);

type Label = z.infer<typeof label>;
type Value = z.infer<typeof value>;
type Eq = z.infer<typeof eq>;
type Neq = z.infer<typeof neq>;
type In = z.infer<typeof in_>;
type NotIn = z.infer<typeof notIn>;
type Includes = z.infer<typeof includes>;
type NotIncludes = z.infer<typeof notIncludes>;
type Matches = z.infer<typeof matches>;
type NotMatches = z.infer<typeof notMatches>;
type Unit = z.infer<typeof unit>;

type And = { and: Array<Unit | And | Or> };
type Or = { or: Array<Unit | And | Or> };
type Condition = z.infer<typeof condition>;

const calcOperators = [
  "in",
  "notIn",
  "includes",
  "notIncludes",
  "matches",
  "notMatches",
  "eq",
  "neq",
] as const;

const operators = ["and", "or", ...calcOperators] as const;
type Operator = (typeof operators)[number];

export {
  type Label,
  type Value,
  type Eq,
  type Neq,
  type In,
  type NotIn,
  type Includes,
  type NotIncludes,
  type Matches,
  type NotMatches,
  type Unit,
  type And,
  type Or,
  type Condition,
  type Operator,
  operators,
  calcOperators,
  condition,
  label,
  value,
  labelValue,
  labelArrayValue,
  eq,
  neq,
  in_,
  notIn,
  includes,
  notIncludes,
  matches,
  notMatches,
  unit,
  and,
  or,
};
