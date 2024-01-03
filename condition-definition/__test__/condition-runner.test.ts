import { expect, test, describe } from "bun:test";
import {
  evaluateCondition,
  extractDependentKeys,
  evaluateConditionDict,
} from "../condition-runner";

describe("evaluateCondition", () => {
  test("equals: [ok]", () => {
    const keyValues = {
      label1: "1",
    };
    expect(evaluateCondition(keyValues, { type: "equals", key: "label1", value: "1" })).toEqual(
      true,
    );
  });

  test("equals: [fail]", () => {
    const keyValues = {
      label1: "1",
    };
    expect(evaluateCondition(keyValues, { type: "equals", key: "label1", value: "2" })).toEqual(
      false,
    );
  });

  test("notEquals: [ok]", () => {
    const keyValues = {
      label1: "1",
    };
    expect(evaluateCondition(keyValues, { type: "notEquals", key: "label1", value: "2" })).toEqual(
      true,
    );
  });

  test("notEquals: [fail]", () => {
    const keyValues = {
      label1: "1",
    };
    expect(evaluateCondition(keyValues, { type: "notEquals", key: "label1", value: "1" })).toEqual(
      false,
    );
  });

  test("in: [ok]", () => {
    const keyValues = {
      label1: "1",
    };
    expect(
      evaluateCondition(keyValues, { type: "in", key: "label1", value: ["1", "2", "3"] }),
    ).toEqual(true);
  });

  test("in: [fail]", () => {
    const keyValues = {
      label1: "1",
    };
    expect(evaluateCondition(keyValues, { type: "in", key: "label1", value: ["2", "3"] })).toEqual(
      false,
    );
  });

  test("notIn: [ok]", () => {
    const keyValues = {
      label1: "1",
    };
    expect(
      evaluateCondition(keyValues, { type: "notIn", key: "label1", value: ["2", "3"] }),
    ).toEqual(true);
  });

  test("notIn: [fail]", () => {
    const keyValues = {
      label1: "1",
    };
    expect(
      evaluateCondition(keyValues, { type: "notIn", key: "label1", value: ["1", "2", "3"] }),
    ).toEqual(false);
  });

  test("includes: [ok]", () => {
    const keyValues = {
      label1: "123",
    };
    expect(evaluateCondition(keyValues, { type: "includes", key: "label1", value: "2" })).toEqual(
      true,
    );
  });

  test("includes: [fail]", () => {
    const keyValues = {
      label1: "123",
    };
    expect(evaluateCondition(keyValues, { type: "includes", key: "label1", value: "4" })).toEqual(
      false,
    );
  });

  test("notIncludes: [ok]", () => {
    const keyValues = {
      label1: "123",
    };
    expect(
      evaluateCondition(keyValues, { type: "notIncludes", key: "label1", value: "4" }),
    ).toEqual(true);
  });

  test("notIncludes: [fail]", () => {
    const keyValues = {
      label1: "123",
    };
    expect(
      evaluateCondition(keyValues, { type: "notIncludes", key: "label1", value: "2" }),
    ).toEqual(false);
  });

  test("matches: [ok]", () => {
    const keyValues = {
      label1: "label1",
    };
    expect(
      evaluateCondition(keyValues, { type: "matches", key: "label1", value: "label\\d+" }),
    ).toEqual(true);
  });

  test("matches: [fail]", () => {
    const keyValues = {
      label1: "label1",
    };
    expect(
      evaluateCondition(keyValues, { type: "matches", key: "label1", value: "label[A-Za-z]+" }),
    ).toEqual(false);
  });

  test("and: [ok]", () => {
    const keyValues = {
      label1: "1",
      label2: "2",
    };
    expect(
      evaluateCondition(keyValues, {
        type: "and",
        children: [
          { type: "equals", key: "label1", value: "1" },
          { type: "equals", key: "label2", value: "2" },
        ],
      }),
    ).toEqual(true);
  });

  test("and: [fail]", () => {
    const keyValues = {
      label1: "1",
      label2: "2",
    };
    expect(
      evaluateCondition(keyValues, {
        type: "and",
        children: [
          { type: "equals", key: "label1", value: "1" },
          { type: "equals", key: "label2", value: "3" },
        ],
      }),
    ).toEqual(false);
  });

  test("or: [ok]", () => {
    const keyValues = {
      label1: "1",
      label2: "2",
    };
    expect(
      evaluateCondition(keyValues, {
        type: "or",
        children: [
          { type: "equals", key: "label1", value: "1" },
          { type: "equals", key: "label2", value: "3" },
        ],
      }),
    ).toEqual(true);
  });

  test("or: [fail]", () => {
    const keyValues = {
      label1: "1",
      label2: "2",
    };
    expect(
      evaluateCondition(keyValues, {
        type: "or",
        children: [
          { type: "equals", key: "label1", value: "2" },
          { type: "equals", key: "label2", value: "3" },
        ],
      }),
    ).toEqual(false);
  });

  test("not: [ok]", () => {
    const keyValues = {
      label1: "1",
    };
    expect(
      evaluateCondition(keyValues, {
        type: "not",
        child: { type: "equals", key: "label1", value: "2" },
      }),
    ).toEqual(true);
  });
});

describe("extractDependentKeys", () => {
  test("usual operator", () => {
    const condition = { type: "equals", key: "label1", value: "1" } as const;
    expect(extractDependentKeys(condition)).toEqual(["label1"]);
  });

  test("and operator", () => {
    const condition = {
      type: "and",
      children: [
        { type: "equals", key: "label1", value: "1" },
        { type: "equals", key: "label2", value: "2" },
      ],
    } as const;
    expect(extractDependentKeys(condition)).toEqual(["label1", "label2"]);
  });

  test("or operator", () => {
    const condition = {
      type: "or",
      children: [
        { type: "equals", key: "label1", value: "1" },
        { type: "equals", key: "label2", value: "2" },
      ],
    } as const;
    expect(extractDependentKeys(condition)).toEqual(["label1", "label2"]);
  });

  test("not operator", () => {
    const condition = {
      type: "not",
      child: { type: "equals", key: "label1", value: "1" },
    } as const;
    expect(extractDependentKeys(condition)).toEqual(["label1"]);
  });

  test("nested operator", () => {
    const condition = {
      type: "and",
      children: [
        { type: "equals", key: "label1", value: "1" },
        {
          type: "or",
          children: [
            { type: "equals", key: "label2", value: "2" },
            { type: "equals", key: "label3", value: "3" },
          ],
        },
      ],
    } as const;
    expect(extractDependentKeys(condition)).toEqual(["label1", "label2", "label3"]);
  });

  test("remove duplicates", () => {
    const condition = {
      type: "and",
      children: [
        { type: "equals", key: "label1", value: "1" },
        { type: "equals", key: "label1", value: "1" },
      ],
    } as const;
    expect(extractDependentKeys(condition)).toEqual(["label1"]);
  });
});

describe("evaluateConditionDict", () => {
  test("all ok", () => {
    const keyValues = {
      label1: "1",
      label2: "2",
    };
    const conditionDict = {
      label1: { type: "equals", key: "label2", value: "2" },
      label2: { type: "equals", key: "label1", value: "1" },
    } as const;
    expect(evaluateConditionDict(keyValues, conditionDict)).toEqual({
      ok: ["label1", "label2"],
      fail: [],
      undefined: [],
    });
  });

  test("all fail", () => {
    const keyValues = {
      label1: "1",
      label2: "2",
    };
    const conditionDict = {
      label1: { type: "equals", key: "label2", value: "3" },
      label2: { type: "equals", key: "label1", value: "2" },
    } as const;
    expect(evaluateConditionDict(keyValues, conditionDict)).toEqual({
      ok: [],
      fail: ["label1", "label2"],
      undefined: [],
    });
  });

  test("some ok", () => {
    const keyValues = {
      label1: "1",
      label2: "2",
    };
    const conditionDict = {
      label1: { type: "equals", key: "label1", value: "1" },
      label2: { type: "equals", key: "label2", value: "1" },
    } as const;
    expect(evaluateConditionDict(keyValues, conditionDict)).toEqual({
      ok: ["label1"],
      fail: ["label2"],
      undefined: [],
    });
  });

  test("some undefined", () => {
    const keyValues = {
      label1: "1",
      label2: "2",
      label3: "3",
    };
    const conditionDict = {
      label1: { type: "equals", key: "label3", value: "3" },
      label2: { type: "equals", key: "label2", value: "1" },
    } as const;
    expect(evaluateConditionDict(keyValues, conditionDict)).toEqual({
      ok: ["label1"],
      fail: ["label2"],
      undefined: ["label3"],
    });
  });

  test("fail when dependent key failed", () => {
    const keyValues = {
      label1: "1",
      label2: "2",
    };
    const conditionDict = {
      label1: { type: "equals", key: "label2", value: "2" },
      label2: { type: "equals", key: "label2", value: "1" },
    } as const;
    expect(evaluateConditionDict(keyValues, conditionDict)).toEqual({
      ok: [],
      fail: ["label1", "label2"],
      undefined: [],
    });
  });

  test("extraDependentKeys", () => {
    const keyValues = {
      label1: "1",
      label2: "2",
      label3: "3",
    };
    const conditionDict = {
      label1: { type: "equals", key: "label2", value: "1" },
      label2: { type: "equals", key: "label2", value: "2" },
    } as const;
    const extraDependentKeys = {
      label3: ["label1"],
    };
    expect(evaluateConditionDict(keyValues, conditionDict, extraDependentKeys)).toEqual({
      ok: ["label2"],
      fail: ["label1", "label3"],
      undefined: [],
    });
  });
});
