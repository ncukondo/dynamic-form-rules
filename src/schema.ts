import { z } from "zod";

const key = z.string();
const value = z.string();
const equals = z.object({ type: z.literal("equals"), key, value });
const notEquals = z.object({ type: z.literal("notEquals"), key, value });
const in_ = z.object({ type: z.literal("in"), key, value: z.array(value) });
const notIn = z.object({ type: z.literal("notIn"), key, value: z.array(value) });
const includes = z.object({ type: z.literal("includes"), key, value });
const notIncludes = z.object({ type: z.literal("notIncludes"), key, value });
const matches = z.object({ type: z.literal("matches"), key, value });
const notMatches = z.object({ type: z.literal("notMatches"), key, value });

const not: z.ZodType<Not> = z.object({
  type: z.literal("not"),
  child: z.union([z.lazy(() => unit), z.lazy(() => and), z.lazy(() => or)]),
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
const rule = z.union([and, or, unit]);

type Key = z.infer<typeof key>;
type Value = z.infer<typeof value>;
type Equals = z.infer<typeof equals>;
type NotEquals = z.infer<typeof notEquals>;
type In = z.infer<typeof in_>;
type NotIn = z.infer<typeof notIn>;
type Includes = z.infer<typeof includes>;
type NotIncludes = z.infer<typeof notIncludes>;
type Matches = z.infer<typeof matches>;
type NotMatches = z.infer<typeof notMatches>;
type Unit = z.infer<typeof unit>;

type Not = { type: "not"; child: Unit | And | Or };
type And = { type: "and"; children: ReadonlyArray<Unit | And | Or> };
type Or = { type: "or"; children: ReadonlyArray<Unit | And | Or> };
type Rule = Readonly<z.infer<typeof rule>>;

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

const safeParseObject = (input: unknown) => {
  const res = rule.safeParse(input);
  const { success: ok } = res;
  return ok ? { ok, value: res.data } : { ok, error: res.error };
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
  type Operator,
  type CalcOperator,
  calcOperators,
  safeParseObject,
};
