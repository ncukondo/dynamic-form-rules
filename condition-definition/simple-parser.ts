/**

# Simple Parser

Simple parser combinator library for TypeScript.

## Type Definitions:

- OkResult<T>: Represents a successful parsing result. It contains the parsed value and the position in the text after parsing.
- FailResult: Represents a failed parsing result.
- Result<T>: A union type that can be either OkResult<T> or FailResult.
- Parser<T>: An interface for a parser function. It takes a string and a position, and returns a Result<T>.

## Parser Functions:

- regParser: A higher-order function that creates a parser for a given regular expression. It returns a function that takes a string and a position, and tries to match the regular expression at that position in the string.
- stringParser: A higher-order function that creates a parser for a given string. It returns a function that checks if the input string starts with the given string at the given position.


## Parser Combinator:

- map: A higher-order function that takes a parser and a transformation function. It applies the parser to the input, and if successful, applies the transformation function to the result.
- or: A higher-order function that takes a list of parsers and returns a new parser that tries each parser in the list until one succeeds.

*/
type OkResult<T> = { ok: true; value: T; pos: number };
type FailResult = { ok: false };
type Result<T> = OkResult<T> | FailResult;
interface Parser<T> {
  (text: string, pos: number): Result<T>;
}

/**
 * Parser using regular expression. You can specify which group to return.
 * @param reg Regular expression. Just source is used. Flags are always fixed to "ym".
 * @param index Group index to return. Default is 0.
 * @returns 
 */
const regParser: (reg: RegExp) => Parser<string> =
  (reg: RegExp, index = 0) => (text: string, pos: number) => {
    const regObj = new RegExp(reg.source, "ym");
    const match = text.substring(pos).match(regObj);
    if (match && match.length < index + 1) {
      throw new Error(
        `reg contains less group than expected: got "${reg.source}" index: ${index}`,
      );
    }
    return match !== null
      ? { ok: true, value: match[index], pos: pos + match[0].length }
      : { ok: false };
  };

/**
 * Simple parser for a given string.
 * @param str string to parse
 * @returns 
 */
const stringParser: (str: string) => Parser<string> =
  (str: string) => (text: string, pos: number) =>
    text.startsWith(str, pos)
      ? { ok: true, value: str, pos: pos + str.length }
      : { ok: false };

/**
 * Transform the result of a parser.
 * @param parser original parser
 * @param f function to transform the result
 * @returns 
 */
const map: <T, U>(parser: Parser<T>, f: (value: T) => U) => Parser<U> =
  <T, U>(parser: Parser<T>, f: (value: T) => U) =>
    (text: string, pos: number) => {
      const res = parser(text, pos);
      return res.ok ? { ok: true, pos: res.pos, value: f(res.value) } : res;
    };

/**
 * Combine parsers. Try each parser in the list until one succeeds.
 * @param parsers parsers to combine
 * @returns one of the parsers which succeeds first
 */
const or: <T>(...parsers: [...Parser<T>[]]) => Parser<T> =
  <T>(...parsers: [...Parser<T>[]]) => (text: string, pos: number) => {
    for (const parser of parsers) {
      const res = parser(text, pos);
      if (res.ok) return res;
    }
    return { ok: false };
  };

/**
 * Sequence parsers. Apply each parser in the list in order and return the result as an array.
 * @param parsers parsers to combine
 * @returns list of results
 */
const seq: <T>(...parsers: [...Parser<T>[]]) => Parser<T[]> =
  <T>(...parsers: [...Parser<T>[]]) => (text: string, pos: number) => {
    const value: T[] = [];
    let currentPos = pos;
    for (const parser of parsers) {
      const res = parser(text, currentPos);
      if (!res.ok) return { ok: false };
      currentPos = res.pos;
      value.push(res.value);
    }
    return { ok: true, pos: currentPos, value };
  };

/**
 * Apply a parser repeatedly until it fails.
 * @param parser parser to apply
 * @returns list of results
 */
const many: <T>(parser: Parser<T>) => Parser<T[]> =
  <T>(parser: Parser<T>) => (text: string, pos: number) => {
    const value: T[] = [];
    let currentPos = pos;
    while (true) {
      const res = parser(text, currentPos);
      if (!res.ok) break;
      currentPos = res.pos;
      value.push(res.value);
    }
    return { ok: true, pos: currentPos, value };
  };

const skipFirst: <T>(first: Parser<unknown>, second: Parser<T>) => Parser<T> =
  <T>(first: Parser<unknown>, second: Parser<T>) =>
    (text: string, pos: number) => {
      const res = first(text, pos);
      return res.ok ? second(text, res.pos) : res;
    };

const skipSecond: <T>(first: Parser<T>, second: Parser<unknown>) => Parser<T> =
  <T>(first: Parser<T>, second: Parser<unknown>) =>
    (text: string, pos: number) => {
      const res = first(text, pos);
      if (!res.ok) return res;
      return second(text, res.pos).ok ? res : { ok: false };
    };

const quoted = <T>(
  startQuote: Parser<unknown>,
  parser: Parser<T>,
  endQuote: Parser<unknown>,
): Parser<T> =>
  (text: string, pos: number) => {
    const res = startQuote(text, pos);
    if (!res.ok) return { ...res, pos };
    const res2 = parser(text, res.pos);
    if (!res2.ok) return { ...res2, pos };
    const res3 = endQuote(text, res2.pos);
    if (!res3.ok) return { ...res3, pos };
    return { ok: true, pos: res3.pos, value: res2.value };
  };

const seqBy: <T>(parser: Parser<T>, sep: Parser<unknown>) => Parser<T[]> =
  <T>(parser: Parser<T>, sep: Parser<unknown>) =>
    (
      text: string,
      pos: number,
    ) => {
      const first = parser(text, pos);
      if (!first.ok) return first;
      const unit = skipFirst(sep, parser);
      const units = many(unit);
      const res = units(text, first.pos);
      if (!res.ok) return res;
      return { ok: true, pos: res.pos, value: [first.value, ...res.value] };
    };

const assert = <T>(parser: Parser<T>, condition: (value: T) => boolean, msg: string): Parser<T> => {
  return (text: string, pos: number) => {
    const res = parser(text, pos);
    if (!res.ok) return res;
    if (!condition(res.value)) return { ok: false, pos, msg };
    return res;
  };
}

const lazy = <T>(parserFactory: () => Parser<T>): Parser<T> => {
  let cached: Parser<T> | null = null;
  return (text: string, pos: number) => {
    if (cached === null) cached = parserFactory();
    return cached(text, pos);
  };
}

const eof: Parser<null> = (text: string, pos: number) =>
  pos >= text.length ? { ok: true, pos, value: null } : { ok: false };

export {
  type Parser,
  type Result,
  type OkResult,
  type FailResult,
  regParser,
  stringParser,
  map,
  or,
  assert,
  seq,
  many,
  skipFirst,
  skipSecond,
  lazy,
  quoted,
  seqBy,
  eof,
}