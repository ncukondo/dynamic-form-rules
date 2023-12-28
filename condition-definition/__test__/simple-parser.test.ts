import { expect, test } from "bun:test";
import {
  stringParser,
  regParser,
  eof,
  map,
  or,
  seq,
  skipFirst,
  skipSecond,
  lazy,
  assert,
  quoted,
  sepBy,
  peak,
  prettyPrintError,
} from "../simple-parser";

test("stringParser", () => {
  expect(stringParser("abc")("abc", 0)).toEqual({
    ok: true,
    pos: 3,
    value: "abc",
  });
});

test("stringParser fail", () => {
  expect(stringParser("abc")("ab", 0)).toEqual({
    ok: false,
    pos: 0,
    expect: `"abc"`,
  });
});

test("regParser", () => {
  expect(regParser(/\d+/)("123", 0)).toEqual({
    ok: true,
    pos: 3,
    value: "123",
  });
});

test("regParser fail", () => {
  expect(regParser(/\d+/)("abc", 0)).toEqual({
    ok: false,
    pos: 0,
    expect: "/\\d+/",
  });
});

test("eof", () => {
  expect(eof()("", 0)).toEqual({
    ok: true,
    pos: 0,
    value: null,
  });
});

test("eof fail", () => {
  expect(eof()("a", 0)).toEqual({
    ok: false,
    pos: 0,
    expect: "EOF",
  });
});

test("map", () => {
  expect(
    map(stringParser("abc"), (value) => value.toUpperCase())("abc", 0),
  ).toEqual({
    ok: true,
    pos: 3,
    value: "ABC",
  });
});

test("or", () => {
  expect(or(stringParser("abc"), stringParser("def"))("abc", 0)).toEqual({
    ok: true,
    pos: 3,
    value: "abc",
  });
});

test("or", () => {
  expect(or(stringParser("abc"), stringParser("def"))("def", 0)).toEqual({
    ok: true,
    pos: 3,
    value: "def",
  });
});

test("or fail", () => {
  expect(or(stringParser("abc"), stringParser("def"))("ghi", 0)).toEqual({
    ok: false,
    pos: 0,
    expect: `"abc" or "def"`,
  });
});

test("seq", () => {
  expect(seq(stringParser("abc"), stringParser("def"))("abcdef", 0)).toEqual({
    ok: true,
    pos: 6,
    value: ["abc", "def"],
  });
});

test("seq fail", () => {
  expect(seq(stringParser("abc"), stringParser("def"))("abc", 0)).toEqual({
    ok: false,
    pos: 3,
    expect: `"def"`,
  });
});

test("skipFirst", () => {
  expect(
    skipFirst(stringParser("abc"), stringParser("def"))("abcdef", 0),
  ).toEqual({
    ok: true,
    pos: 6,
    value: "def",
  });
});

test("skipFirst fail", () => {
  expect(skipFirst(stringParser("abc"), stringParser("def"))("abc", 0)).toEqual(
    {
      ok: false,
      pos: 3,
      expect: `"def"`,
    },
  );
});

test("skipSecond", () => {
  expect(
    skipSecond(stringParser("abc"), stringParser("def"))("abcdef", 0),
  ).toEqual({
    ok: true,
    pos: 6,
    value: "abc",
  });
});

test("skipSecond fail", () => {
  expect(
    skipSecond(stringParser("abc"), stringParser("def"))("abc", 0),
  ).toEqual({
    ok: false,
    pos: 3,
    expect: `"def"`,
  });
});

test("lazy", () => {
  const parser = lazy(() => stringParser("abc"));
  expect(parser("abc", 0)).toEqual({
    ok: true,
    pos: 3,
    value: "abc",
  });
});

test("lazy fail", () => {
  const parser = lazy(() => stringParser("abc"));
  expect(parser("ab", 0)).toEqual({
    ok: false,
    pos: 0,
    expect: `"abc"`,
  });
});

test("assert", () => {
  expect(
    assert(
      stringParser("abc"),
      (value) => value === "abc",
      "should be abc",
    )("abc", 0),
  ).toEqual({
    ok: true,
    pos: 3,
    value: "abc",
  });
});

test("assert fail", () => {
  expect(
    assert(
      stringParser("abc"),
      (value) => value === "def",
      "should be def",
    )("abc", 0),
  ).toEqual({
    ok: false,
    pos: 0,
    expect: "should be def",
  });
});

test("quoted", () => {
  expect(
    quoted(
      stringParser('"'),
      stringParser("abc"),
      stringParser('"'),
    )(`"abc"`, 0),
  ).toEqual({
    ok: true,
    pos: 5,
    value: "abc",
  });
});

test("quoted fail", () => {
  expect(
    quoted(stringParser('"'), stringParser("abc"), stringParser('"'))("abc", 0),
  ).toEqual({
    ok: false,
    pos: 0,
    expect: `"""`,
  });
});

test("sepBy", () => {
  expect(sepBy(stringParser("abc"), stringParser(","))("abc,abc", 0)).toEqual({
    ok: true,
    pos: 7,
    value: ["abc", "abc"],
  });
});

test("sepBy fail", () => {
  expect(sepBy(stringParser("abc"), stringParser(","))("ab,cabc", 0)).toEqual({
    ok: false,
    pos: 0,
    expect: `"abc"`,
  });
});

test("peak", () => {
  expect(peak(stringParser("abc"), regParser(/\s+/))("abc ", 0)).toEqual({
    ok: true,
    pos: 3,
    value: "abc",
  });
});

test("peak fail", () => {
  expect(peak(stringParser("abc"), regParser(/\s+/))("abc", 0)).toEqual({
    ok: false,
    pos: 0,
    expect: "FollowedBy /\\s+/",
  });
});

// biome-ignore lint/style/noUnusedTemplateLiteral: <explanation>
test(`prettyPrintError`, () => {
  expect(prettyPrintError("abc", { ok: false, pos: 1, expect: `"b"` })).toEqual(
    `\
[line:1,column:2] Expect "b"
   1 | abc
        ^`,
  );
});
