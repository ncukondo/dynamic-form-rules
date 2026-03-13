import { describe, expect, test } from "vitest";
import { ruleToSource } from "../rule-to-source";

describe("ruleToSource", () => {
  test("simple operator", () => {
    expect(ruleToSource({ type: "equals", key: "key1", value: "1" })).toEqual("key1=1");
  });

  test("in operator", () => {
    expect(ruleToSource({ type: "in", key: "key1", value: ["1", "2"] })).toEqual("key1 in [1,2]");
  });

  test("key and value with space", () => {
    expect(ruleToSource({ type: "equals", key: "key 1", value: "value 1" })).toEqual(
      `"key 1"="value 1"`,
    );
  });

  test("key and value with double quote", () => {
    expect(ruleToSource({ type: "equals", key: 'key"1', value: 'value"1' })).toEqual(
      `'key"1'='value"1'`,
    );
  });

  test("key and value with single quote", () => {
    expect(ruleToSource({ type: "equals", key: "key'1", value: "value'1" })).toEqual(
      `"key'1"="value'1"`,
    );
  });

  test("key and value with double quote and single quote", () => {
    expect(ruleToSource({ type: "equals", key: "key'\"1", value: "value'1" })).toEqual(
      `'key''"1'="value'1"`,
    );
  });

  test("and operator", () => {
    expect(
      ruleToSource({
        type: "and",
        children: [
          { type: "equals", key: "key1", value: "1" },
          { type: "equals", key: "key2", value: "2" },
        ],
      }),
    ).toEqual("key1=1 and key2=2");
  });

  test("or operator", () => {
    expect(
      ruleToSource({
        type: "or",
        children: [
          { type: "equals", key: "key1", value: "1" },
          { type: "equals", key: "key2", value: "2" },
        ],
      }),
    ).toEqual("(key1=1 or key2=2)");
  });

  test("not operator", () => {
    expect(
      ruleToSource({
        type: "not",
        child: { type: "equals", key: "key1", value: "1" },
      }),
    ).toEqual("not(key1=1)");
  });

  test("and operator with or operator", () => {
    expect(
      ruleToSource({
        type: "and",
        children: [
          { type: "equals", key: "key1", value: "1" },
          {
            type: "or",
            children: [
              { type: "equals", key: "key2", value: "2" },
              { type: "equals", key: "key3", value: "3" },
            ],
          },
        ],
      }),
    ).toEqual("key1=1 and (key2=2 or key3=3)");
  });

  test("or operator with and operator", () => {
    expect(
      ruleToSource({
        type: "or",
        children: [
          { type: "equals", key: "key1", value: "1" },
          {
            type: "and",
            children: [
              { type: "equals", key: "key2", value: "2" },
              { type: "equals", key: "key3", value: "3" },
            ],
          },
        ],
      }),
    ).toEqual("(key1=1 or key2=2 and key3=3)");
  });

  test("not operator with and operator", () => {
    expect(
      ruleToSource({
        type: "not",
        child: {
          type: "and",
          children: [
            { type: "equals", key: "key1", value: "1" },
            { type: "equals", key: "key2", value: "2" },
          ],
        },
      }),
    ).toEqual("not(key1=1 and key2=2)");
  });
});
