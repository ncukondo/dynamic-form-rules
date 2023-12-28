import { type Condition, parseCondition, calcOperators } from "./parse-condition";

type KeyValues = Record<string, string>;
type Key<T extends KeyValues> = keyof T;
type Value<T extends KeyValues, K extends Key<T>> = T[K];
type DisabledKeys<T extends KeyValues> = Key<T>[];
type DefaultValues<T extends KeyValues> = Partial<T>;
type Dependencies<T extends KeyValues> = {
  [K in Key<T>]?: Key<T>[];
};
type Conditions<T extends KeyValues> = {
  [K in Key<T>]?: Condition;
};
type ConditionsBySource<T extends KeyValues> = {
  [K in Key<T>]?: string;
};
type ExecuteCondition<T extends KeyValues> = (
  keyValues: T,
  conditions: Conditions<T>,
  dependencies?: Dependencies<T>,
) => DisabledKeys<T>;
type ExecuteConditionBySource<T extends KeyValues> = (
  keyValues: T,
  conditions: ConditionsBySource<T>,
  dependencies?: Dependencies<T>,
) => DisabledKeys<T>;

type ConditionOperator = keyof Condition;

const evaluateCondition: <T extends KeyValues>(keyValues: T, condition: Condition) => boolean = <
  T extends KeyValues,
>(
  keyValues: T,
  condition: Condition,
) => {
  const key: Condition = Object.keys(condition)[0] as keyof typeof condition;
  const value = (key: keyof Condition) => condition[key];
  switch (key) {
    case "and":
      return value(key).every((c) => evaluateCondition(keyValues, c));
    case "or":
      return value.some((c) => evaluateCondition(keyValues, c));
    case "eq":
      return keyValues[value.label] === value.value;
    case "neq":
      return keyValues[value.label] !== value.value;
    case "in":
      return value.value.includes(keyValues[value.label]);
    case "includes":
      return keyValues[value.label].includes(value.value);
    case "notIncludes":
      return !keyValues[value.label].includes(value.value);
    case "matches":
      return new RegExp(value.value).test(keyValues[value.label]);
    default:
      throw new Error(`unknown condition: ${JSON.stringify(condition)}`);
  }
  if ("and" in condition) {
    return condition.and.every((c) => evaluateCondition(keyValues, c));
  }
  if ("or" in condition) {
    return condition.or.some((c) => evaluateCondition(keyValues, c));
  }
  if ("eq" in condition) {
    const { label, value } = condition.eq;
    return keyValues[label] === value;
  }
  if ("neq" in condition) {
    const { label, value } = condition.neq;
    return keyValues[label] !== value;
  }
  if ("in" in condition) {
    const { label, value } = condition.in;
    return value.includes(keyValues[label]);
  }
  if ("includes" in condition) {
    const { label, value } = condition.includes;
    return keyValues[label].includes(value);
  }
  if ("notIncludes" in condition) {
    const { label, value } = condition.notIncludes;
    return !keyValues[label].includes(value);
  }
  if ("matches" in condition) {
    const { label, value } = condition.matches;
    return new RegExp(value).test(keyValues[label]);
  }
  throw new Error(`unknown condition: ${JSON.stringify(condition)}`);
};

const extractDependentLabels: (condition: Condition) => string[] = (condition: Condition) => {
  const containsCalcOperator = (condition: Condition): boolean => {
    return calcOperators.some((op) => op in condition);
  };
  const extractLabels = (condition: Condition): string[] => {
    return calcOperators.flatMap((op) => {
      if (op in condition) {
        const { label } = condition[op as keyof typeof condition];
        return [label];
      }
      return [];
    });
  };
  if ("and" in condition) {
    return condition.and.flatMap(extractDependentLabels);
  }
  if ("or" in condition) {
    return condition.or.flatMap(extractDependentLabels);
  }
  if (containsCalcOperator(condition)) {
    return extractLabels(condition);
  }
  throw new Error(`unknown condition: ${JSON.stringify(condition)}`);
};
const executeCondition: ExecuteCondition<KeyValues> = (
  keyValues,
  conditions,
  dependencies = {},
) => {
  const removeDuplicated = <T>(array: T[]) => [...new Set(array)];
  const combinedDependencies = Object.fromEntries(
    Object.entries(conditions).flatMap(([key, condition]) => {
      if (condition === undefined) return [];
      const initial = dependencies[key] ?? [];
      const labels = [...initial, ...(condition ? extractDependentLabels(condition) : [])];
      return [[key, labels]];
    }),
  ) as Dependencies<KeyValues>;
  const initialDisabledKeys: DisabledKeys<KeyValues> = Object.keys(keyValues).filter((key) => {
    const condition = conditions[key];
    if (condition === undefined) return false;
    return !evaluateCondition(keyValues, condition);
  });
  const extraDisabledKeys: DisabledKeys<KeyValues> = Object.entries(combinedDependencies)
    .filter(([, labels]) => {
      return labels?.some((label) => initialDisabledKeys.includes(label));
    })
    .map(([key]) => key);
  return removeDuplicated([...initialDisabledKeys, ...extraDisabledKeys]);
};

const executeConditionBySource: ExecuteConditionBySource<KeyValues> = (
  keyValues,
  conditionSources,
  dependencies = {},
) => {
  const conditions = Object.fromEntries(
    Object.entries(conditionSources).flatMap(([key, source]) => {
      if (source === undefined) return [];
      const res = parseCondition(source);
      if (!res.ok) throw new Error(`failed to parse condition: ${source}`);
      return [[key, res.value]];
    }),
  ) as Conditions<KeyValues>;
  return executeCondition(keyValues, conditions, dependencies);
};

export {
  executeCondition,
  evaluateCondition,
  executeConditionBySource,
  type ExecuteCondition,
  type KeyValues,
  type Key,
  type Value,
  type DisabledKeys,
  type DefaultValues,
  type Dependencies,
  type Conditions,
};
