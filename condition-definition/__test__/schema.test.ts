import { test, expect, describe } from "bun:test";
import { safeParseObject } from "../schema";

describe("safeParseObject", () => {
  test("in operator [ok]", () => {
    const condition = safeParseObject({ type: "in", key: "label1", value: ["1", "2", "3"] });
    expect(condition.ok).toEqual(true);
  });

  test("in operator [fail]", () => {
    const condition = safeParseObject({ type: "in", key: "label1", value: "2" });
    expect(condition.ok).toEqual(false);
  });

  test("notEquals operator [ok]", () => {
    const condition = safeParseObject({ type: "notEquals", key: "label1", value: "2" });
    expect(condition.ok).toEqual(true);
  });

  test("notEquals operator [fail]", () => {
    const condition = safeParseObject({ type: "notEquals", key: "label1", value: ["2", "3"] });
    expect(condition.ok).toEqual(false);
  });

  test("and operator [ok]", () => {
    const condition = safeParseObject({
      type: "and",
      children: [
        { type: "equals", key: "label1", value: "1" },
        { type: "equals", key: "label2", value: "2" },
      ],
    });
    expect(condition.ok).toEqual(true);
  });

  test("and operator [fail]", () => {
    const condition = safeParseObject({
      type: "and",
      child: { type: "equals", key: "label1", value: "1" },
    });
    expect(condition.ok).toEqual(false);
  });

  test("not operator [ok]", () => {
    const condition = safeParseObject({
      type: "not",
      child: { type: "equals", key: "label1", value: "1" },
    });
    expect(condition.ok).toEqual(true);
  });

  test("not operator [fail]", () => {
    const condition = safeParseObject({
      type: "not",
      children: [
        { type: "equals", key: "label1", value: "1" },
        { type: "equals", key: "label2", value: "2" },
      ],
    });
    expect(condition.ok).toEqual(false);
  });

  test("inappropriate type", () => {
    const condition = safeParseObject({ type: "type-not-defined", key: "label1", value: 1 });
    expect(condition.ok).toEqual(false);
  });
});
