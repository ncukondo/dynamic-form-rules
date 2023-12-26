/**

# Simple Parser

Simple parser combinator library for TypeScript.

*/

// ------------------------------------------------------------
// Type definitions
// ------------------------------------------------------------

/**
 * Represents a successful parsing result.
 * It contains the parsed value and the position in the text after parsing.
 */
type OkResult<T> = { ok: true; value: T; pos: number };

/**
 * Represents a failed parsing result.
 */
type FailResult = { ok: false; pos: number; expect: string };

/**
 * A union type that can be either OkResult<T> or FailResult.
 */
type Result<T> = OkResult<T> | FailResult;
/**
 * An interface for a parser function.
 */
interface Parser<T> {
  (text: string, pos: number): Result<T>;
}

// Utility types (mainly for seq function)
type Box<T> = Parser<T>;
type TupleBox<T> = { [P in keyof T]: Box<T[P]> };
type UnBoxTuple<T extends TupleBox<unknown>> = { [P in keyof T]: T[P] extends Box<infer U> ? U : never };


// ------------------------------------------------------------
// Parser functions
// ------------------------------------------------------------

/**
 * [Parser]Parser using regular expression. You can specify which group to return.
 * @param reg Regular expression. Just source is used. Flags are always fixed to "ym".
 * @param index Group index to return. Default is 0.
 * @returns result of reg.exec
 * @example
 * const parser = regParser(/([0-9]+) ([0-9]+)/, 1);
 * parser("1 2", 0); // { ok: true, pos: 3, value: "1" }
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
      : { ok: false, pos, expect: `/${reg.source}/` };
  };

/**
 * [Parser]Simple parser for a given string.
 * @param str string to parse
 * @returns 
 */
const stringParser: (str: string) => Parser<string> =
  (str: string) => (text: string, pos: number) =>
    text.startsWith(str, pos)
      ? { ok: true, value: str, pos: pos + str.length }
      : { ok: false, pos, expect: `"${str}"` };

/**
 * [Parser]Parser that only succeeds at the end of the text.
 * @returns parser only succeeds at the end of the text.
 * @example
 * const parser = seq(regParser(/[0-9]+/), eof());
 * parser("123", 0); // { ok: true, pos: 3, value: ["123", null] }
 */
const eof: () => Parser<null> = () => (text: string, pos: number) =>
  pos >= text.length ? { ok: true, pos, value: null } : { ok: false, pos, expect: "EOF" };

// ------------------------------------------------------------
// Parser combinator
// ------------------------------------------------------------

/**
 * [Combinator]Check if the result of the parser satisfies the condition.
 * @param parser parser to check
 * @param condition condition to check
 * @param message message to show when condition fails
 * @returns return parser if condition is true, otherwise return failed parser.
 * @example
 * const parser = assert(regParser(/[0-9]/), value => value === "1", "should be 1");
 * parser("1", 0); // { ok: true, pos: 1, value: "1" }
 * parser("2", 0); // { ok: false, pos: 0, message: "should be 1" }
 */
const assert = <T>(parser: Parser<T>, condition: (value: T) => boolean, expect: string): Parser<T> => {
  return (text: string, pos: number) => {
    const res = parser(text, pos);
    if (!res.ok) return res;
    if (!condition(res.value)) return { ok: false, pos, expect };
    return res;
  };
}

/**
 * [Combinator]Create a parser that is not evaluated until it is used.
 * @param parserFactory function to create a parser
 * @returns parser
 * @example
 * const parser = lazy(() => regParser(/[0-9]/));
 * parser("1", 0); // { ok: true, pos: 1, value: "1" }
 */
const lazy = <T>(parserFactory: () => Parser<T>): Parser<T> => {
  let cached: Parser<T> | null = null;
  return (text: string, pos: number) => {
    if (cached === null) cached = parserFactory();
    return cached(text, pos);
  };
}


/**
 * [Combinator]Transform the result of a parser.
 * @param parser original parser
 * @param f function to transform the result
 * @returns transformed parser
 * @example
 * const parser = map(regParser(/[0-9]/), value => parseInt(value));
 * parser("1", 0); // { ok: true, pos: 1, value: 1 }
 */
const map: <T, U>(parser: Parser<T>, f: (value: T) => U) => Parser<U> =
  <T, U>(parser: Parser<T>, f: (value: T) => U) =>
    (text: string, pos: number) => {
      const res = parser(text, pos);
      return res.ok ? { ok: true, pos: res.pos, value: f(res.value) } : res;
    };

/**
 * [Combinator]Combine parsers. Try each parser in the list until one succeeds.
 * @param parsers parsers to combine
 * @returns one of the parsers which succeeds first
 * @example
 * const parser = or(regParser(/[0-9]/), regParser(/[a-z]/));
 * parser("z", 0); // { ok: true, pos: 1, value: "z" }
 */
const or: <T>(...parsers: [...Parser<T>[]]) => Parser<T> =
  <T>(...parsers: [...Parser<T>[]]) => (text: string, pos: number) => {
    const messages: string[] = [];
    for (const parser of parsers) {
      const res = parser(text, pos);
      if (res.ok) return res;
      messages.push(res.expect);
    }
    return { ok: false, pos, expect: `${messages.join(" or ")}` };
  };

/**
 * [Combinator]Sequence parsers. Apply each parser in the list in order and return the result as an array.
 * @param parsers parsers to combine
 * @returns list of results
 * @example
 * const parser = seq(regParser(/[0-9]/), regParser(/[0-9]/));
 * parser("12", 0); // { ok: true, pos: 2, value: ["1", "2"] }
 */
const seq: <T extends readonly [...Parser<unknown>[]]>(...parsers: T) => Parser<UnBoxTuple<T>> =
  <T extends readonly [...Parser<unknown>[]]>(...parsers: T) => (text: string, pos: number) => {
    const value: any[] = [];
    let currentPos = pos;
    for (const parser of parsers) {
      const res = parser(text, currentPos);
      if (!res.ok) return { ok: false, pos: currentPos, expect: res.expect };
      currentPos = res.pos;
      value.push(res.value);
    }
    return { ok: true, pos: currentPos, value: value as UnBoxTuple<T> };
  };


/**
 * [Combinator]Apply a parser repeatedly until it fails.
 * @param parser parser to apply
 * @returns list of results
 * @example
 * const parser = many(regParser(/[0-9]/));
 * parser("123", 0); // { ok: true, pos: 3, value: ["1", "2", "3"] }
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

/**
 * [Combinator]Apply two parsers and return the result of the second parser.
 * @param first first parser to apply (ignored)
 * @param second second parser to apply
 * @returns Parser<T>
 * @example
 * const parser = skipFirst(stringParser("a"), stringParser("b"));
 * parser("ab", 0); // { ok: true, pos: 2, value: "b" }
 */
const skipFirst: <T>(first: Parser<unknown>, second: Parser<T>) => Parser<T> =
  <T>(first: Parser<unknown>, second: Parser<T>) =>
    (text: string, pos: number) => {
      const res = first(text, pos);
      return res.ok ? second(text, res.pos) : res;
    };

/**
 * [Combinator]Apply two parsers and return the result of the first parser.
 * @param first first parser to apply
 * @param second second parser to apply (ignored)
 * @returns 
 */
const skipSecond: <T>(first: Parser<T>, second: Parser<unknown>) => Parser<T> =
  <T>(first: Parser<T>, second: Parser<unknown>) =>
    (text: string, pos: number) => {
      const res = first(text, pos);
      if (!res.ok) return res;
      const res2 = second(text, res.pos);
      return res2.ok
        ? { ok: true, pos: res2.pos, value: res.value }
        : { ok: false, pos: res2.pos, expect: res2.expect };
    };

/**
 * [Combinator]check if target parser succeeds and followedBy parser also succeeds.
 * Ignore the result of followedBy parser.
 * @param target target parser
 * @param followedBy parser to apply after target
 * @returns result of target parser
 */
const peak: <T>(target: Parser<T>, followedBy: Parser<unknown>) => Parser<T> =
  <T>(target: Parser<T>, followedBy: Parser<unknown>) =>
    (text: string, pos: number) => {
      const res = target(text, pos);
      if (!res.ok) return res;
      const res2 = followedBy(text, res.pos);
      if (!res2.ok) return { ok: false, pos, expect: `FollowedBy ${res2.expect}` };
      return res;
    };

/**
 * [Combinator]Apply three parsers and return the result of the middle parser.
 * @param startQuote first parser to apply(ignored)
 * @param parser second parser to apply 
 * @param endQuote third parser to apply(ignored)
 * @returns parser result of second parser
 * @example
 * const parser = quoted(stringParser("'"), regParser(/[0-9]+/), stringParser("'"));
 * parser("'123'", 0); // { ok: true, pos: 5, value: "123" }
 */
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

/**
 * [Combinator]Apply a parser repeatedly until it fails. The result of the parser is separated by the separator parser.
 * @param parser parser to apply
 * @param sep separator parser (ignored)
 * @returns list of results
 * @example
 * const parser = sepBy(regParser(/[0-9]+/), stringParser(","));
 * parser("1,2,3", 0); // { ok: true, pos: 5, value: ["1", "2", "3"] }
*/
const sepBy: <T>(parser: Parser<T>, sep: Parser<unknown>) => Parser<T[]> =
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

const prettyPrintError = (text: string, failResult: FailResult) => {
  const { pos, expect } = failResult;
  const lines = text.split("\n");
  const line = lines.findIndex(line => pos < line.length);
  const column = pos - lines.slice(0, line).join("\n").length;
  const lineHeader = `${line + 1}`.padStart(4, " ") + " | ";
  const lineText = lineHeader + lines[line];
  const pointer = " ".repeat(column + 7) + "^";
  return `[line:${line + 1},column:${column + 1}] Expect ${expect}\n${lineText}\n${pointer}`;
}

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
  sepBy,
  eof,
  peak,
  prettyPrintError,
}