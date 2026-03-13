/**
 * This file contains the implementation of a rule runner, which evaluates rules based on key values and condition dictionary.
 * It provides functions for evaluating individual rules, extracting dependent keys from a rule, and evaluating rules based on key values and condition dictionary.
 * The file also defines various types used in the rule runner.
 *
 * Example usage:
 *
 * import { evaluateRule, evaluateRuleDict, extractDependentKeysS } from "./rule-runner";
 *
 * // Evaluate a rule
 * const keyValues = {
 *   name: "John",
 *   age: "25",
 *   gender: "male",
 * };
 * const rule = {
 *   type: "equals",
 *   key: "age",
 *   value: "25",
 * };
 * const result = evaluateRule(keyValues, rule); // Returns true
 *
 * // Extract dependent keys from a rule
 * const dependentKeys = extractDependentKeys(rule); // Returns ["age"]
 *
 * // Evaluate rules based on key values and condition dictionary
 * const conditionDict: ConditionDict<MyKeyValues> = {
 *   name: { type: "equals", key: "gender", value: "male" },
 *   age: { type: "equals", key: "name", value: "John" },
 *   gender: { type: "equals", key: "age", value: "100" },
 * };
 *
 * const evaluationResult = evaluateRuleDict(keyValues, conditionDict);
 * // Returns {
 * //   ok: ["name",  "gender"],
 * //   fail: ["age"],
 * //   undefined: []
 * // }
 */
import type { Rule } from "./schema";

// Define types
type KeyValues = Record<string, string>;
type Key<T extends KeyValues> = keyof T;
type Value<T extends KeyValues, K extends Key<T>> = T[K];
type DisabledKeys<T extends KeyValues> = Key<T>[];
type DefaultValues<T extends KeyValues> = Partial<T>;
type Dependencies<T extends KeyValues> = {
  [K in Key<T>]?: Key<T>[];
};
type ConditionDict<T extends KeyValues> = {
  [K in Key<T>]?: Rule;
};
type PartialKey<T extends Record<string, unknown>> = (keyof T)[][number];

// Evaluate a rule based on key values
const evaluateRule = <T extends KeyValues>(keyValues: T, rule: Rule): boolean => {
  const type = rule.type;
  switch (type) {
    case "and":
      return rule.children.every((child) => evaluateRule(keyValues, child));
    case "or":
      return rule.children.some((child) => evaluateRule(keyValues, child));
    case "not":
      return !evaluateRule(keyValues, rule.child);
    case "equals":
      return keyValues[rule.key] === rule.value;
    case "notEquals":
      return keyValues[rule.key] !== rule.value;
    case "in":
      return rule.value.includes(keyValues[rule.key]);
    case "notIn":
      return !rule.value.includes(keyValues[rule.key]);
    case "includes":
      return keyValues[rule.key].includes(rule.value);
    case "notIncludes":
      return !keyValues[rule.key].includes(rule.value);
    case "matches":
      return new RegExp(rule.value).test(keyValues[rule.key]);
    case "notMatches":
      return !new RegExp(rule.value).test(keyValues[rule.key]);
    default:
      throw new Error(`unknown condition type: ${type}`);
  }
};

// Extract dependent keys from a rule
const extractDependentKeys = (rule: Rule): string[] => {
  const removeDuplicates = <T>(array: T[]): T[] => [...new Set(array)];
  const type = rule.type;
  switch (type) {
    case "and":
      return removeDuplicates(rule.children.flatMap(extractDependentKeys));
    case "or":
      return removeDuplicates(rule.children.flatMap(extractDependentKeys));
    case "not":
      return extractDependentKeys(rule.child);
    default:
      if ("key" in rule) {
        return Array.isArray(rule.key) ? [...rule.key] : [rule.key];
      }
      throw new Error(`unknown condition type: ${type}`);
  }
};

// Result of evaluating rules
type EvaluateRuleResult<T extends KeyValues> = {
  ok: (keyof T)[];
  fail: (keyof T)[];
  undefined: (keyof T)[];
};

// Evaluate rules based on key values and condition dictionary
const evaluateRuleDict = <T extends KeyValues>(
  keyValues: T,
  conditionDict: ConditionDict<T>,
  dependencies: Record<string, string[]> = {},
): EvaluateRuleResult<T> => {
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
      const result = evaluateRule(keyValues, condition);
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

  // Return the result dictionary

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
  evaluateRule,
  evaluateRuleDict,
  extractDependentKeys,
  type KeyValues,
  type Key,
  type Value,
  type DisabledKeys,
  type DefaultValues,
  type Dependencies,
  type ConditionDict,
};
