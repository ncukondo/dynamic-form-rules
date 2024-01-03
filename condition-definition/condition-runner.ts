import { type Condition } from "./schema";

type KeyValues = Record<string, string>;
type Key<T extends KeyValues> = keyof T;
type Value<T extends KeyValues, K extends Key<T>> = T[K];
type DisabledKeys<T extends KeyValues> = Key<T>[];
type DefaultValues<T extends KeyValues> = Partial<T>;
type Dependencies<T extends KeyValues> = {
  [K in Key<T>]?: Key<T>[];
};
type ConditionDict<T extends KeyValues> = {
  [K in Key<T>]?: Condition;
};
type PartialKey<T extends Record<string, unknown>> = (keyof T)[][number];

const evaluateCondition = <T extends KeyValues>(keyValues: T, condition: Condition): boolean => {
  const type = condition.type;
  switch (type) {
    case "and":
      return condition.children.every((child) => evaluateCondition(keyValues, child));
    case "or":
      return condition.children.some((child) => evaluateCondition(keyValues, child));
    case "not":
      return !evaluateCondition(keyValues, condition.child);
    case "equals":
      return keyValues[condition.key] === condition.value;
    case "notEquals":
      return keyValues[condition.key] !== condition.value;
    case "in":
      return condition.value.includes(keyValues[condition.key]);
    case "notIn":
      return !condition.value.includes(keyValues[condition.key]);
    case "includes":
      return keyValues[condition.key].includes(condition.value);
    case "notIncludes":
      return !keyValues[condition.key].includes(condition.value);
    case "matches":
      return new RegExp(condition.value).test(keyValues[condition.key]);
    case "notMatches":
      return !new RegExp(condition.value).test(keyValues[condition.key]);
    default:
      throw new Error(`unknown condition type: ${type}`);
  }
};

const extractDependentKeys = (condition: Condition): string[] => {
  const removeDuplicates = <T>(array: T[]): T[] => [...new Set(array)];
  const type = condition.type;
  switch (type) {
    case "and":
      return removeDuplicates(condition.children.flatMap(extractDependentKeys));
    case "or":
      return removeDuplicates(condition.children.flatMap(extractDependentKeys));
    case "not":
      return extractDependentKeys(condition.child);
    default:
      if ("key" in condition) {
        return Array.isArray(condition.key) ? [...condition.key] : [condition.key];
      }
      throw new Error(`unknown condition type: ${type}`);
  }
};

type EvaluateConditionDictResult<T extends KeyValues> = {
  ok: (keyof T)[];
  fail: (keyof T)[];
  undefined: (keyof T)[];
};
const evaluateConditionDict = <T extends KeyValues>(
  keyValues: T,
  conditionDict: ConditionDict<T>,
  dependencies: Record<string, string[]> = {},
): EvaluateConditionDictResult<T> => {
  const combinedDependencies = {
    ...dependencies,
    ...Object.fromEntries(
      Object.entries(conditionDict).flatMap(([key, condition]) => {
        if (condition === undefined) return [];
        const dependentKeys = [...(dependencies[key] ?? []), ...extractDependentKeys(condition)];
        return [[key, dependentKeys]];
      }),
    ),
  } as Record<PartialKey<T>, PartialKey<T>[]>;
  type ResultDict = Record<keyof T, "ok" | "fail" | "undefined">;
  const resultDict = Object.fromEntries(
    Object.keys(keyValues).map((key: keyof T) => {
      const condition = conditionDict[key];
      if (condition === undefined) return [key, "undefined"];
      const result = evaluateCondition(keyValues, condition);
      return [key, result ? "ok" : "fail"];
    }),
  ) as ResultDict;
  const extraDisabledKeys: DisabledKeys<KeyValues> = Object.entries(combinedDependencies)
    .filter(([, keys]) => {
      return keys?.some((key) => resultDict[key as keyof T] === "fail");
    })
    .map(([key]) => key);
  for (const key of extraDisabledKeys) {
    resultDict[key as keyof T] = "fail";
  }
  return {
    ok: Object.entries(resultDict)
      .filter(([, result]) => result === "ok")
      .map(([key]) => key as keyof T),
    fail: Object.entries(resultDict)
      .filter(([, result]) => result === "fail")
      .map(([key]) => key as keyof T),
    undefined: Object.entries(resultDict)
      .filter(([, result]) => result === "undefined")
      .map(([key]) => key as keyof T),
  };
};

export {
  evaluateCondition,
  evaluateConditionDict,
  extractDependentKeys,
  type KeyValues,
  type Key,
  type Value,
  type DisabledKeys,
  type DefaultValues,
  type Dependencies,
  type ConditionDict,
};
