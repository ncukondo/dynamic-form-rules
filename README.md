# Dynamic Form Rules

This package provides a set of utility functions for evaluating dynamic form rules.

## Table of Contents

- [Installation](#installation)
- [Rule object](#rule-object)
- Functions
  - [safeParseSource](#safeparsesource)
    - parse source code to rule object
  - [safeParseObject](#safeparseobject)
    - parse unknown object to rule object
  - [evaluateRule](#evaluaterule)
    - evaluate rule object
  - [evaluateRuleDict](#evaluateruledict)
    - evaluate rule dictionary object
  - [extractDependentKeys](#extractdependentkeys)
    - extract dependent keys from rule object
  - [ruleToSource](#ruletosource)
    - convert rule object to source code
- [License](#license)

## Installation

To install:

```bash
npm install @ncukondo/dynamic-form-rules
```

or

```bash
yarn add @ncukondo/dynamic-form-rules
```

## Rule object

A `Rule` is one of the following units, or a combination of them:

| Type | Shape | Meaning |
| --- | --- | --- |
| `equals` | `{ type: "equals", key, value }` | `data[key] === value` |
| `notEquals` | `{ type: "notEquals", key, value }` | `data[key] !== value` |
| `in` | `{ type: "in", key, value: string[] }` | `value` array contains `data[key]` |
| `notIn` | `{ type: "notIn", key, value: string[] }` | `value` array does not contain `data[key]` |
| `includes` | `{ type: "includes", key, value }` | `data[key]` contains `value` as substring |
| `notIncludes` | `{ type: "notIncludes", key, value }` | `data[key]` does not contain `value` |
| `matches` | `{ type: "matches", key, value }` | `data[key]` matches regexp `value` |
| `notMatches` | `{ type: "notMatches", key, value }` | `data[key]` does not match regexp `value` |
| `and` | `{ type: "and", children: Rule[] }` | all children are true |
| `or` | `{ type: "or", children: Rule[] }` | some child is true |
| `not` | `{ type: "not", child: Rule }` | child is false |

All keys and values are strings (`value` is a string array for `in` / `notIn`).

## Functions

### safeParseSource

The `safeParseSource` function is a utility function used to safely parse source code defines dynamic form rule.

#### Usage

```typescript
import { safeParseSource } from '@ncukondo/dynamic-form-rules';

const sourceCode = 'your source code here';
const parsedSource = safeParseSource(sourceCode);
```

#### Parameters

- sourceCode (string): The source code to be parsed.

#### Returns

parsedSource (object): The parsed source code object. If the parsing fails, it returns an error object.

```typescript
type Result<Rule> = {
  ok: true;
  pos: number;
  value: Rule;
} | {
  ok: false;
  pos: number;
  expect: string;
};
```

#### Examples

```typescript
// Parsing an "equals" operator
const condition1 = safeParseSource("label1=1");
// Returns: { ok: true, pos: 8, value: { type: "equals", key: "label1", value: "1" } }

// key and value other than a-zA-Z0-9_ must be quoted
const condition2 = safeParseSource("label1='1.1'");
// Returns: { ok: true, pos: 12, value: { type: "equals", key: "label1", value: "1.1" } }

// key and value with quote should be escaped by double
const condition3 = safeParseSource("label1='1''1'");
// Returns: { ok: true, pos: 13, value: { type: "equals", key: "label1", value: "1'1" } }

// not equals
const condition4 = safeParseSource("label1<>1");
// Returns: { ok: true, pos: 9, value: { type: "notEquals", key: "label1", value: "1" } }

// in (you can also use notIn)
const condition5 = safeParseSource("label1 in [1,2,3]");
// Returns: { ok: true, pos: 17, value: { type: "in", key: "label1", value: ["1", "2", "3"] } }

// includes (you can also use notIncludes)
const condition6 = safeParseSource("label1 includes 1");
// Returns: { ok: true, pos: 17, value: { type: "includes", key: "label1", value: "1" } }

// matches (you can also use notMatches)
const condition7 = safeParseSource("label1 matches 'label\\d+'");
// Returns: { ok: true, pos: 25, value: { type: "matches", key: "label1", value: "label\\d+" } }

// and
const condition8 = safeParseSource("label1=1 and label2=2");
// Returns: { 
//   ok: true, 
//   pos: 21, 
//   value: { 
//     type: "and", 
//     children: [
//       { type: "equals", key: "label1", value: "1" }, 
//       { type: "equals", key: "label2", value: "2" }
//     ] 
//    } 
// }

// or
const condition9 = safeParseSource("label1=1 or label2<>2");
// Returns: {
//   ok: true,
//   pos: 21,
//   value: {
//     type: "or",
//     children: [
//       { type: "equals", key: "label1", value: "1" },
//       { type: "notEquals", key: "label2", value: "2" }
//     ]
//   }
// }

// and has higher precedence than or
const condition10 = safeParseSource("label1=1 or label2=2 and label3=3");
// Returns: {
//   ok: true,
//   pos: 33,
//   value: {
//     type: "or",
//     children: [
//       { type: "equals", key: "label1", value: "1" },
//       {
//         type: "and",
//         children: [
//           { type: "equals", key: "label2", value: "2" },
//           { type: "equals", key: "label3", value: "3" }
//         ]
//       }
//     ]
//   }
// }

// parentheses
const condition11 = safeParseSource("(label1=1 or label2=2) and label3=3");
// Returns: {
//   ok: true,
//   pos: 35,
//   value: {
//     type: "and",
//     children: [
//       {
//         type: "or",
//         children: [
//           { type: "equals", key: "label1", value: "1" },
//           { type: "equals", key: "label2", value: "2" }
//         ]
//       },
//       { type: "equals", key: "label3", value: "3" }
//     ]
//   }
// }


// not
const condition12 = safeParseSource("not label1 in [1,2,3]");
// Returns: { ok: true, pos: 21, value: { type: "not", child:{type:"in", key: "label1", value: ["1", "2", "3"] } } }

// multiple keys anyOf (you can also use allOf, noneOf)
// anyOf expands to "or", allOf expands to "and",
// and noneOf expands to "not" wrapping an "or"
const condition13 = safeParseSource("anyOf(label1,label2)=1");
// Returns: {
//   ok: true,
//   pos: 22,
//   value: {
//     type: "or",
//     children: [
//       { type: "equals", key: "label1", value: "1" },
//       { type: "equals", key: "label2", value: "1" }
//     ]
//   }
// }
```

### safeParseObject

The `safeParseObject` function is a utility function used to safely parse unknown objects to rule object.

#### Usage

```typescript
import { safeParseObject } from '@ncukondo/dynamic-form-rules';

const object = { type: 'equals', key: 'label1', value: '1' };

const parsedObject = safeParseObject(object);
```

#### Parameters

- object (unknown): The object to be parsed.

#### Returns

parsedObject (object): The parsed object. If the parsing fails, it returns an error object containing the [valibot](https://valibot.dev/) issues.

```typescript
type SafeParseObjectResult = {
  ok: true;
  value: Rule;
} | {
  ok: false;
  error: v.InferIssue<typeof rule>[]; // valibot issues
};
```

#### Examples

```typescript
// success
const condition1 = safeParseObject({ type: 'in', key: 'label1', value: ['1', '2', '3'] });
// Returns: { ok: true, value: { type: "in", key: "label1", value: ["1", "2", "3"] } }

// failure
const condition2 = safeParseObject({ type: 'in', key: 'label1', value: '1' });
// Returns: { ok: false, error: [/* valibot issues */] }
```

### evaluateRule

The `evaluateRule` function is a utility function used to evaluate a rule object against a data object.

#### Usage

```typescript
import { evaluateRule } from '@ncukondo/dynamic-form-rules';

const data = { label1: '1' };
const rule = { type: 'equals', key: 'label1', value: '1' };

const result = evaluateRule(data, rule); // Returns: true
```

#### Parameters

- data (Record<string,string>): The data object to be used for evaluation.
- rule (Rule): The rule object to be evaluated.

#### Returns

result (boolean): The result of the evaluation.

#### Examples

- Evaluating an "equals" operator:

```typescript
const data = { label1: '1' };
const rule = { type: 'equals', key: 'label1', value: '1' };

const result = evaluateRule(data, rule); // Returns: true
```

- Evaluating an "in" operator:

```typescript
const data = { label1: '1' };
const rule = { type: 'in', key: 'label1', value: ['1', '2', '3'] };

const result = evaluateRule(data, rule); // Returns: true
```

- Evaluating a "notIn" operator:

```typescript
const data = { label1: '1' };
const rule = { type: 'notIn', key: 'label1', value: ['1', '2', '3'] };

const result = evaluateRule(data, rule); // Returns: false
```

- Evaluating a "matches" operator:

```typescript
const data = { label1: 'label12' };
const rule = { type: 'matches', key: 'label1', value: 'label\\d+' };

const result = evaluateRule(data, rule); // Returns: true
```

### evaluateRuleDict

The `evaluateRuleDict` function is a utility function used to evaluate a rule dictionary object. Each key of the dictionary is classified into `ok`, `fail` or `undefined` (no rule defined for the key).

If a rule of a key references (depends on) another key and the rule of that referenced key fails, the depending key is also marked as `fail`.

#### Usage

```typescript
import { evaluateRuleDict } from '@ncukondo/dynamic-form-rules';

const data = { key1: '1', key2: '2', key3: '3' };

const ruleDict = {
  key1: { type: 'equals', key: 'key1', value: '1' },
  key2: { type: 'equals', key: 'key2', value: '1' },
};

const result = evaluateRuleDict(data, ruleDict); // Returns: {ok:["key1"],fail:["key2"],undefined:["key3"]}
```

#### Parameters

- data (Record<string,string>): The data object to be used for evaluation.
- ruleDict (Record<string,Rule>): The rule dictionary object to be evaluated.
- dependencies (Record<string,string[]>, optional): Extra dependent keys. If any of the listed keys fails, the depending key is also marked as `fail`.

#### Returns

result (object): The result of the evaluation.

```typescript
type Result = {
  ok: string[];
  fail: string[];
  undefined: string[];
};
```

#### Examples

- Evaluating an "in" operator:

```typescript
const data = { key1: '1', key2: '2', key3: '3' };

const ruleDict = {
  key1: { type: 'in', key: 'key1', value: ['1', '2', '3'] },
  key2: { type: 'in', key: 'key2', value: ['1', '2', '3'] },
};

const result = evaluateRuleDict(data, ruleDict); // Returns: {ok:["key1","key2"],fail:[],undefined:["key3"]}
```

- A key fails when the key it depends on fails:

```typescript
const data = { label1: '1', label2: '2' };

const ruleDict = {
  // label1's rule itself is satisfied, but it depends on label2, whose rule fails
  label1: { type: 'equals', key: 'label2', value: '2' },
  label2: { type: 'equals', key: 'label2', value: '1' },
};

const result = evaluateRuleDict(data, ruleDict); // Returns: {ok:[],fail:["label1","label2"],undefined:[]}
```

- Adding extra dependencies:

```typescript
const data = { label1: '1', label2: '2', label3: '3' };

const ruleDict = {
  label1: { type: 'equals', key: 'label2', value: '1' },
  label2: { type: 'equals', key: 'label2', value: '2' },
};

const dependencies = {
  label3: ['label1'],
};

const result = evaluateRuleDict(data, ruleDict, dependencies);
// Returns: {ok:["label2"],fail:["label1","label3"],undefined:[]}
```

### extractDependentKeys

The `extractDependentKeys` function is a utility function used to extract dependent keys from a rule object.

#### Usage

```typescript
import { extractDependentKeys } from '@ncukondo/dynamic-form-rules';

const rule = { type: 'equals', key: 'label1', value: '1' };

const dependentKeys = extractDependentKeys(rule); // Returns: ["label1"]
```

#### Parameters

- rule (Rule): The rule object to be evaluated.

#### Returns

dependentKeys (string[]): The dependent keys extracted from the rule object (duplicates removed).

#### Examples

- Extracting dependent keys from rule with "and" operator:

```typescript
const rule = {
  type: 'and',
  children: [
    { type: 'equals', key: 'label1', value: '1' },
    { type: 'equals', key: 'label2', value: '2' },
  ],
};

const dependentKeys = extractDependentKeys(rule); // Returns: ["label1","label2"]
```

### ruleToSource

Convert rule object to source code. Keys and values containing characters other than `a-zA-Z0-9_` are quoted automatically.

#### Usage

```typescript
import { ruleToSource } from '@ncukondo/dynamic-form-rules';

const rule = { type: 'equals', key: 'label1', value: '1' };

const source = ruleToSource(rule); // Returns: "label1=1"
```

#### Parameters

- rule (Rule): The rule object to be converted.

#### Returns

source (string): The source code converted from the rule object.

#### Examples

- Converting rule with "and" operator to source code:

```typescript
const rule = {
  type: 'and',
  children: [
    { type: 'equals', key: 'label1', value: '1' },
    { type: 'equals', key: 'label2', value: '2' },
  ],
};

const source = ruleToSource(rule); // Returns: "label1=1 and label2=2"
```

- Converting rule with "or" operator to source code:

```typescript
const rule = {
  type: 'or',
  children: [
    { type: 'equals', key: 'label1', value: '1' },
    { type: 'equals', key: 'label2', value: '2' },
  ],
};

const source = ruleToSource(rule); // Returns: "(label1=1 or label2=2)"
```

- Converting rule with "not" operator to source code:

```typescript
const rule = {
  type: 'not',
  child: { type: 'in', key: 'label1', value: ['1', '2', '3'] },
};

const source = ruleToSource(rule); // Returns: "not(label1 in [1,2,3])"
```

## License

MIT
