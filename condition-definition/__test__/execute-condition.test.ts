import { expect, test } from "bun:test";
import {
  executeCondition,
  evaluateCondition,
  executeConditionBySource,
} from "../execute-condition";

test("label1=1", () => {
  const keyValues = { label1: "1" };
  const conditions = { label1: { eq: { label: "label1", value: "1" } } };
  expect(executeCondition(keyValues, conditions)).toEqual([]);
});

test("label1=1 and label2=2", () => {
  const keyValues = { label1: "1", label2: "2" };
  const conditions = {
    label1: { eq: { label: "label1", value: "1" } },
    label2: { eq: { label: "label2", value: "2" } },
  };
  expect(executeCondition(keyValues, conditions)).toEqual([]);
});

test("label1=1 and label2=2 and label3=3", () => {
  const keyValues = { label1: "1", label2: "2", label3: "3" };
  const conditions = {
    label1: { eq: { label: "label1", value: "1" } },
    label2: { eq: { label: "label2", value: "2" } },
    label3: { eq: { label: "label3", value: "1" } },
  };
  expect(executeCondition(keyValues, conditions)).toEqual(["label3"]);
});

test("Fail if dependent key fail.", () => {
  const keyValues = { label1: "1", label2: "2", label3: "3" };
  const conditions = {
    label1: { eq: { label: "label3", value: "3" } },
    label2: { eq: { label: "label2", value: "2" } },
    label3: { eq: { label: "label3", value: "1" } },
  };
  expect(executeCondition(keyValues, conditions)).toEqual(["label3", "label1"]);
});

test("label1=1 or label2=2", () => {
  const keyValues = { label1: "1", label2: "2" };
  const conditionSources = {
    label1: "label1=1",
  };
  expect(executeConditionBySource(keyValues, conditionSources)).toEqual([]);
});

test("Fail if dependent key fail.", () => {
  const keyValues = { label1: "1", label2: "2", label3: "3" };
  const conditionSources = {
    label1: "label3=3",
    label3: "label1=2",
  };
  expect(executeConditionBySource(keyValues, conditionSources)).toEqual(["label3", "label1"]);
});

test("in operator", () => {
  const keyValues = { label1: "1", label2: "2", label3: "3" };
  const conditionSources = {
    label1: `label1 in ["1", "2"]`,
  };
  expect(executeConditionBySource(keyValues, conditionSources)).toEqual([]);
});

test("in operator fail", () => {
  const keyValues = { label1: "1", label2: "2", label3: "3" };
  const conditionSources = {
    label1: `label1 in ["2", "3"]`,
  };
  expect(executeConditionBySource(keyValues, conditionSources)).toEqual(["label1"]);
});

test("includes operator", () => {
  const keyValues = { label1: "123", label2: "2", label3: "3" };
  const conditionSources = {
    label1: `label1 includes "1"`,
  };
  expect(executeConditionBySource(keyValues, conditionSources)).toEqual([]);
});

test("includes operator fail", () => {
  const keyValues = { label1: "123", label2: "2", label3: "3" };
  const conditionSources = {
    label1: `label1 includes "4"`,
  };
  expect(executeConditionBySource(keyValues, conditionSources)).toEqual(["label1"]);
});
