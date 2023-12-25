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
type ExecuteCondition<T extends KeyValues> = (keyValues: T, conditions: Conditions<T>, dependencies?: Dependencies<T>) => DisabledKeys<T>;
type ExecuteConditionBySource<T extends KeyValues> = (keyValues: T, conditions: ConditionsBySource<T>, dependencies?: Dependencies<T>) => DisabledKeys<T>;

const evaluateCondition: <T extends KeyValues>(keyValues: T, condition: Condition) => boolean = <T extends KeyValues>(keyValues: T, condition: Condition) => {
  if ('and' in condition) {
    return condition.and.every(c => evaluateCondition(keyValues, c));
  } else if ('or' in condition) {
    return condition.or.some(c => evaluateCondition(keyValues, c));
  } else if ('eq' in condition) {
    const { label, value } = condition.eq;
    return keyValues[label] === value;
  } else if ('neq' in condition) {
    const { label, value } = condition.neq;
    return keyValues[label] !== value;
  } else if ('in' in condition) {
    const { label, value } = condition.in;
    return value.includes(keyValues[label]);
  } else if ('includes' in condition) {
    const { label, value } = condition.includes;
    return keyValues[label].includes(value);
  } else if ('notIncludes' in condition) {
    const { label, value } = condition.notIncludes;
    return !keyValues[label].includes(value);
  } else if ('matches' in condition) {
    const { label, value } = condition.matches;
    return new RegExp(value).test(keyValues[label]);
  } else {
    throw new Error(`unknown condition: ${JSON.stringify(condition)}`);
  }
}

const extractDependentLabels: (condition: Condition) => string[] = (condition: Condition) => {
  const containsCalcOperator = (condition: Condition): boolean => {
    return calcOperators.some(op => op in condition);
  }
  const extractLabels = (condition: Condition): string[] => {
    return calcOperators.flatMap(op => {
      if (op in condition) {
        const { label } = condition[op as keyof typeof condition];
        return [label];
      } else {
        return [];
      }
    })
  }
  if ('and' in condition) {
    return condition.and.flatMap(extractDependentLabels);
  } else if ('or' in condition) {
    return condition.or.flatMap(extractDependentLabels);
  } else if (containsCalcOperator(condition)) {
    return extractLabels(condition);
  } else {
    throw new Error(`unknown condition: ${JSON.stringify(condition)}`);
  }
}
const executeCondition: ExecuteCondition<KeyValues> = (keyValues, conditions, dependencies = {}) => {
  const removeDuplicated = <T>(array: T[]) => [...new Set(array)];
  dependencies = Object.fromEntries(Object.entries(conditions).flatMap(([key, condition]) => {
    if (condition === undefined) return [];
    const initial = dependencies[key] ?? [];
    const labels = [...initial, ...(condition ? extractDependentLabels(condition) : [])];
    return [[key, labels]];
  })) as Dependencies<KeyValues>;
  const initialDisabledKeys: DisabledKeys<KeyValues> = Object.keys(keyValues).filter(key => {
    const condition = conditions[key];
    if (condition === undefined) return false;
    return !evaluateCondition(keyValues, condition);
  });
  const extraDisabledKeys: DisabledKeys<KeyValues> = Object.entries(dependencies).filter(([, labels]) => {
    return labels && labels.some(label => initialDisabledKeys.includes(label));
  }).map(([key]) => key);
  return removeDuplicated([...initialDisabledKeys, ...extraDisabledKeys]);
}

const executeConditionBySource: ExecuteConditionBySource<KeyValues> = (keyValues, conditionSources, dependencies = {}) => {
  const conditions = Object.fromEntries(Object.entries(conditionSources).flatMap(([key, source]) => {
    if (source === undefined) return [];
    const res = parseCondition(source);
    if (!res.ok) throw new Error(`failed to parse condition: ${source}`);
    return [[key, res.value]];
  }
  )) as Conditions<KeyValues>;
  return executeCondition(keyValues, conditions, dependencies);
};



export { executeCondition, evaluateCondition, executeConditionBySource, type ExecuteCondition, type KeyValues, type Key, type Value, type DisabledKeys, type DefaultValues, type Dependencies, type Conditions }