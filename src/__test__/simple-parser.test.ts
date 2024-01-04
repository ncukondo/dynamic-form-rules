import { test, expect } from "vitest";
import {
  string,
  regexp,
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

test("string", () => {
  expect(string("abc")("abc", 0)).toEqual({
    ok: true,
    pos: 3,
    value: "abc",
  });
});

test("string fail", () => {
  expect(string("abc")("ab", 0)).toEqual({
    ok: false,
    pos: 0,
    expect: `"abc"`,
  });
});

test("regexp", () => {
  expect(regexp(/\d+/)("123", 0)).toEqual({
    ok: true,
    pos: 3,
    value: "123",
  });
});

test("regexp fail", () => {
  expect(regexp(/\d+/)("abc", 0)).toEqual({
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
  expect(map(string("abc"), (value) => value.toUpperCase())("abc", 0)).toEqual({
    ok: true,
    pos: 3,
    value: "ABC",
  });
});

test("or", () => {
  expect(or(string("abc"), string("def"))("abc", 0)).toEqual({
    ok: true,
    pos: 3,
    value: "abc",
  });
});

test("or", () => {
  expect(or(string("abc"), string("def"))("def", 0)).toEqual({
    ok: true,
    pos: 3,
    value: "def",
  });
});

test("or fail", () => {
  expect(or(string("abc"), string("def"))("ghi", 0)).toEqual({
    ok: false,
    pos: 0,
    expect: `"abc" or "def"`,
  });
});

test("seq", () => {
  expect(seq(string("abc"), string("def"))("abcdef", 0)).toEqual({
    ok: true,
    pos: 6,
    value: ["abc", "def"],
  });
});

test("seq fail", () => {
  expect(seq(string("abc"), string("def"))("abc", 0)).toEqual({
    ok: false,
    pos: 3,
    expect: `"def"`,
  });
});

test("skipFirst", () => {
  expect(skipFirst(string("abc"), string("def"))("abcdef", 0)).toEqual({
    ok: true,
    pos: 6,
    value: "def",
  });
});

test("skipFirst fail", () => {
  expect(skipFirst(string("abc"), string("def"))("abc", 0)).toEqual({
    ok: false,
    pos: 3,
    expect: `"def"`,
  });
});

test("skipSecond", () => {
  expect(skipSecond(string("abc"), string("def"))("abcdef", 0)).toEqual({
    ok: true,
    pos: 6,
    value: "abc",
  });
});

test("skipSecond fail", () => {
  expect(skipSecond(string("abc"), string("def"))("abc", 0)).toEqual({
    ok: false,
    pos: 3,
    expect: `"def"`,
  });
});

test("lazy", () => {
  const parser = lazy(() => string("abc"));
  expect(parser("abc", 0)).toEqual({
    ok: true,
    pos: 3,
    value: "abc",
  });
});

test("lazy fail", () => {
  const parser = lazy(() => string("abc"));
  expect(parser("ab", 0)).toEqual({
    ok: false,
    pos: 0,
    expect: `"abc"`,
  });
});

test("assert", () => {
  expect(assert(string("abc"), (value) => value === "abc", "should be abc")("abc", 0)).toEqual({
    ok: true,
    pos: 3,
    value: "abc",
  });
});

test("assert fail", () => {
  expect(assert(string("abc"), (value) => value === "def", "should be def")("abc", 0)).toEqual({
    ok: false,
    pos: 0,
    expect: "should be def",
  });
});

test("quoted", () => {
  expect(quoted(string('"'), string("abc"), string('"'))(`"abc"`, 0)).toEqual({
    ok: true,
    pos: 5,
    value: "abc",
  });
});

test("quoted fail", () => {
  expect(quoted(string('"'), string("abc"), string('"'))("abc", 0)).toEqual({
    ok: false,
    pos: 0,
    expect: `"""`,
  });
});

test("sepBy", () => {
  expect(sepBy(string("abc"), string(","))("abc,abc", 0)).toEqual({
    ok: true,
    pos: 7,
    value: ["abc", "abc"],
  });
});

test("sepBy fail", () => {
  expect(sepBy(string("abc"), string(","))("ab,cabc", 0)).toEqual({
    ok: false,
    pos: 0,
    expect: `"abc"`,
  });
});

test("peak", () => {
  expect(peak(string("abc"), regexp(/\s+/))("abc ", 0)).toEqual({
    ok: true,
    pos: 3,
    value: "abc",
  });
});

test("peak fail", () => {
  expect(peak(string("abc"), regexp(/\s+/))("abc", 0)).toEqual({
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
