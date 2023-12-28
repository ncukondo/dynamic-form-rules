import { z } from "zod";

const label = z.string();
const value = z.string();
const labelValue = z.object({ label, value });
const labelArrayValue = z.object({ label, value: z.array(value) });
const equals = z.object({ type: z.literal("equals"), label, value });
const notEquals = z.object({ type: z.literal("notEquals"), label, value });
const in_ = z.object({ type: z.literal("in"), label, value: z.array(value) });
const notIn = z.object({ type: z.literal("notIn"), label, value: z.array(value) });
const includes = z.object({ type: z.literal("includes"), label, value });
const notIncludes = z.object({ type: z.literal("notIncludes"), label, value });
const matches = z.object({ type: z.literal("matches"), label, value });
const notMatches = z.object({ type: z.literal("notMatches"), label, value });
const not = z.object({
  type: z.literal("not"),
  child: z.union([
    equals,
    notEquals,
    in_,
    notIn,
    includes,
    notIncludes,
    matches,
    notMatches,
    z.lazy(() => and),
    z.lazy(() => or),
  ]),
});
const unit = z.union([
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

const and: z.ZodType<And> = z.object({
  type: z.literal("and"),
  children: z.array(z.union([unit, z.lazy(() => and), z.lazy(() => or)])),
});
const or: z.ZodType<Or> = z.object({
  type: z.literal("or"),
  children: z.array(z.union([unit, z.lazy(() => and), z.lazy(() => or)])),
});
const condition = z.union([and, or, unit]);

type Label = z.infer<typeof label>;
type Value = z.infer<typeof value>;
type Equals = z.infer<typeof equals>;
type NotEquals = z.infer<typeof notEquals>;
type In = z.infer<typeof in_>;
type NotIn = z.infer<typeof notIn>;
type Includes = z.infer<typeof includes>;
type NotIncludes = z.infer<typeof notIncludes>;
type Matches = z.infer<typeof matches>;
type NotMatches = z.infer<typeof notMatches>;
type Not = z.infer<typeof not>;
type Unit = z.infer<typeof unit>;

type And = { type: "and"; children: Array<Unit | And | Or> };
type Or = { type: "or"; children: Array<Unit | And | Or> };
type Condition = z.infer<typeof condition>;

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

export {
  type Label,
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
  type Condition,
  type Operator,
  operators,
  calcOperators,
  condition,
  label,
  value,
  labelValue,
  labelArrayValue,
  equals,
  notEquals,
  in_,
  notIn,
  includes,
  notIncludes,
  matches,
  notMatches,
  unit,
  and,
  or,
  not,
};
