import { describe, expect, test } from "vitest";
import { safeParseSource } from "../source-parser";

test("in operator", () => {
  const condition = safeParseSource("label1 in [1,2,3]");
  expect(condition).toEqual({
    ok: true,
    pos: 17,
    value: { type: "in", key: "label1", value: ["1", "2", "3"] },
  });
});

test("not in operator", () => {
  const condition = safeParseSource("label1 notIn [1,2,3]");
  expect(condition).toEqual({
    ok: true,
    pos: 20,
    value: { type: "notIn", key: "label1", value: ["1", "2", "3"] },
  });
});

test("equals operator", () => {
  const condition = safeParseSource("label1=1");
  expect(condition).toEqual({
    ok: true,
    pos: 8,
    value: { type: "equals", key: "label1", value: "1" },
  });
});

test("not equals operator", () => {
  const condition = safeParseSource("label1<>1");
  expect(condition).toEqual({
    ok: true,
    pos: 9,
    value: { type: "notEquals", key: "label1", value: "1" },
  });
});

test("includes operator", () => {
  const condition = safeParseSource("label1 includes 1");
  expect(condition).toEqual({
    ok: true,
    pos: 17,
    value: { type: "includes", key: "label1", value: "1" },
  });
});

test("not includes operator", () => {
  const condition = safeParseSource("label1 notIncludes 1");
  expect(condition).toEqual({
    ok: true,
    pos: 20,
    value: { type: "notIncludes", key: "label1", value: "1" },
  });
});

test("matches operator", () => {
  const condition = safeParseSource("label1 matches 'label\\d+'");
  expect(condition).toEqual({
    ok: true,
    pos: 25,
    value: { type: "matches", key: "label1", value: "label\\d+" },
  });
});

test("not matches operator", () => {
  const condition = safeParseSource("label1 notMatches 'label\\d+'");
  expect(condition).toEqual({
    ok: true,
    pos: 28,
    value: { type: "notMatches", key: "label1", value: "label\\d+" },
  });
});

test("and operator", () => {
  const condition = safeParseSource("label1=1 and label2=2");
  expect(condition).toEqual({
    ok: true,
    pos: 21,
    value: {
      type: "and",
      children: [
        { type: "equals", key: "label1", value: "1" },
        { type: "equals", key: "label2", value: "2" },
      ],
    },
  });
});

test("or operator", () => {
  const condition = safeParseSource("label1=1 or label2=2");
  expect(condition).toEqual({
    ok: true,
    pos: 20,
    value: {
      type: "or",
      children: [
        { type: "equals", key: "label1", value: "1" },
        { type: "equals", key: "label2", value: "2" },
      ],
    },
  });
});

test("and is prior to or", () => {
  const condition = safeParseSource("label1=1 or label2=2 and label3=1");
  expect(condition).toEqual({
    ok: true,
    pos: 33,
    value: {
      type: "or",
      children: [
        { type: "equals", key: "label1", value: "1" },
        {
          type: "and",
          children: [
            { type: "equals", key: "label2", value: "2" },
            { type: "equals", key: "label3", value: "1" },
          ],
        },
      ],
    },
  });
});

test("parenthesized unit", () => {
  const condition = safeParseSource("(label1=1)");
  expect(condition).toEqual({
    ok: true,
    pos: 10,
    value: { type: "equals", key: "label1", value: "1" },
  });
});

test("parenthesized unit with and operator", () => {
  const condition = safeParseSource("(label1=1 and label2=2) and label3=1");
  expect(condition).toEqual({
    ok: true,
    pos: 36,
    value: {
      type: "and",
      children: [
        {
          type: "and",
          children: [
            { type: "equals", key: "label1", value: "1" },
            { type: "equals", key: "label2", value: "2" },
          ],
        },
        { type: "equals", key: "label3", value: "1" },
      ],
    },
  });
});

test("not operator", () => {
  const condition = safeParseSource("not label1=1");
  expect(condition).toEqual({
    ok: true,
    pos: 12,
    value: {
      type: "not",
      child: { type: "equals", key: "label1", value: "1" },
    },
  });
});

test("not operator with and operator", () => {
  const condition = safeParseSource("not label1=1 and label2=2");
  expect(condition).toEqual({
    ok: true,
    pos: 25,
    value: {
      type: "and",
      children: [
        { type: "not", child: { type: "equals", key: "label1", value: "1" } },
        { type: "equals", key: "label2", value: "2" },
      ],
    },
  });
});

test("not operator with in operator", () => {
  const condition = safeParseSource("not label1 in [1,2,3]");
  expect(condition).toEqual({
    ok: true,
    pos: 21,
    value: {
      type: "not",
      child: { type: "in", key: "label1", value: ["1", "2", "3"] },
    },
  });
});

describe("complex operators", () => {
  test("anyOf operator", () => {
    const condition = safeParseSource("anyOf(label1,label2,label3) in [1,2,3]");
    expect(condition).toEqual({
      ok: true,
      pos: 38,
      value: {
        type: "or",
        children: [
          { type: "in", key: "label1", value: ["1", "2", "3"] },
          { type: "in", key: "label2", value: ["1", "2", "3"] },
          { type: "in", key: "label3", value: ["1", "2", "3"] },
        ],
      },
    });
  });

  test("allOf operator", () => {
    const condition = safeParseSource("allOf(label1,label2,label3) in [1,2,3]");
    expect(condition).toEqual({
      ok: true,
      pos: 38,
      value: {
        type: "and",
        children: [
          { type: "in", key: "label1", value: ["1", "2", "3"] },
          { type: "in", key: "label2", value: ["1", "2", "3"] },
          { type: "in", key: "label3", value: ["1", "2", "3"] },
        ],
      },
    });
  });

  test("noneOf operator", () => {
    const condition = safeParseSource("noneOf(label1,label2,label3) in [1,2,3]");
    expect(condition).toEqual({
      ok: true,
      pos: 39,
      value: {
        type: "not",
        child: {
          type: "or",
          children: [
            { type: "in", key: "label1", value: ["1", "2", "3"] },
            { type: "in", key: "label2", value: ["1", "2", "3"] },
            { type: "in", key: "label3", value: ["1", "2", "3"] },
          ],
        },
      },
    });
  });

  test("with white spaces", () => {
    const condition = safeParseSource(" anyOf ( label1 , label2 , label3 ) in [ 1 , 2 , 3 ] ");
    expect(condition).toEqual({
      ok: true,
      pos: 53,
      value: {
        type: "or",
        children: [
          { type: "in", key: "label1", value: ["1", "2", "3"] },
          { type: "in", key: "label2", value: ["1", "2", "3"] },
          { type: "in", key: "label3", value: ["1", "2", "3"] },
        ],
      },
    });
  });

  test("anyOf operator with and operator", () => {
    const condition = safeParseSource("anyOf(label1,label2,label3) in [1,2,3] and label4=4");
    expect(condition).toEqual({
      ok: true,
      pos: 51,
      value: {
        type: "and",
        children: [
          {
            type: "or",
            children: [
              { type: "in", key: "label1", value: ["1", "2", "3"] },
              { type: "in", key: "label2", value: ["1", "2", "3"] },
              { type: "in", key: "label3", value: ["1", "2", "3"] },
            ],
          },
          { type: "equals", key: "label4", value: "4" },
        ],
      },
    });
  });
});
