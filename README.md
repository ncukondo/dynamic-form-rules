# Dynamic Form Rules

This package provides a set of utility functions for evaluating dynamic form rules.

## Table of Contents

- [Installation](#installation)
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
  error: string;
};
```

#### Examples

```typescript
// Parsing an "equals" operator
const condition1 = safeParseSource("label1=1");
// Returns: { ok: true, pos: 8, value: { type: "equals", key: "label1", value: "1" } }

// key and value other than a-zA-Z0-9_ must be quoted
const condition2 = safeParseSource("label1='1.1'");
// Returns: { ok: true, pos: 11, value: { type: "equals", key: "label1", value: "1.1" } }

// key and value with quote should be escaped by double
const condition3 = safeParseSource("label1='1''1'");
// Returns: { ok: true, pos: 12, value: { type: "equals", key: "label1", value: "1'1" } }

// not equals
const condition2 = safeParseSource("label1<>1");
// Returns: { ok: true, pos: 9, value: { type: "notEquals", key: "label1", value: "1" } }

// in (you can also use notIn)
const condition7 = safeParseSource("label1 in [1,2,3]");
// Returns: { ok: true, pos: 17, value: { type: "in", key: "label1", value: ["1", "2", "3"] } }

// match (you can also use notMatch)
const condition9 = safeParseSource("label1 match /\\d+/");
// Returns: { ok: true, pos: 18, value: { type: "match", key: "label1", value: "\\d+" } }

// and
const condition3 = safeParseSource("label1=1 and label2=2");
// Returns: { 
//   ok: true, 
//   pos: 20, 
//   value: { 
//     type: "and", 
//     children: [
//       { type: "equals", key: "label1", value: "1" }, 
//       { type: "equals", key: "label2", value: "2" }
//     ] 
//    } 
// }

// or
const condition4 = safeParseSource("label1=1 or label2<>2");
// Returns: {
//   ok: true,
//   pos: 19,
//   value: {
//     type: "or",
//     children: [
//       { type: "equals", key: "label1", value: "1" },
//       { type: "notEquals", key: "label2", value: "2" }
//     ]
//   }
// }

// and has higher precedence than or
const condition5 = safeParseSource("label1=1 or label2=2 and label3=3");
// Returns: {
//   ok: true,
//   pos: 29,
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
const condition6 = safeParseSource("(label1=1 or label2=2) and label3=3");
// Returns: {
//   ok: true,
//   pos: 33,
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
const condition8 = safeParseSource("not label1 in [1,2,3]");
// Returns: { ok: true, pos: 21, value: { type: "not", child:{type:"in", key: "label1", value: ["1", "2", "3"] } } }

// multiple keys anyOf (you can also use allOf, noneOf)
const condition10 = safeParseSource("anyOf(label1,label2)=1");
// Returns: {
//   ok: true,
//   pos: 21,
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

parsedObject (object): The parsed object. If the parsing fails, it returns an error object.

```typescript
type Result<Rule> = {
  ok: true;
  value: Rule;
} | {
  ok: false;
  error: Error;
};
```

#### Examples

```typescript
// success
const condition1 = safeParseObject({ type: 'in', key: 'label1', value: ['1', '2', '3'] });
// Returns: { ok: true, value: { type: "in", key: "label1", value: ["1", "2", "3"] } }

// failure
const condition2 = safeParseObject({ type: 'in', key: 'label1', value: '1' });
// Returns: { ok: false, error: Error: <Issues> }
```

### evaluateRule

The `evaluateRule` function is a utility function used to evaluate a rule object.

#### Usage

```typescript
import { evaluateRule } from '@ncukondo/dynamic-form-rules';

const rule = { type: 'equals', key: 'label1', value: '1' };
const data = { label1: '1' };

const result = evaluateRule(rule, data); // Returns: true
```

#### Parameters

- rule (Rule): The rule object to be evaluated.
- data (Record<string,string>): The data object to be used for evaluation.

#### Returns

result (boolean): The result of the evaluation.

#### Examples

- Evaluating an "equals" operator:

```typescript
const rule = { type: 'equals', key: 'label1', value: '1' };
const data = { label1: '1' };

const result = evaluateRule(rule, data); // Returns: true
```

- Evaluating an "in" operator:

```typescript
const rule = { type: 'in', key: 'label1', value: ['1', '2', '3'] };
const data = { label1: '1' };

const result = evaluateRule(rule, data); // Returns: true
```

- Evaluating a "not in" operator:

```typescript
const rule = { type: 'notIn', key: 'label1', value: ['1', '2', '3'] };
const data = { label1: '1' };

const result = evaluateRule(rule, data); // Returns: false
```

### evaluateRuleDict

The `evaluateRuleDict` function is a utility function used to evaluate a rule dictionary object.

#### Usage

```typescript
import { evaluateRuleDict } from '@ncukondo/dynamic-form-rules';

const data = { key1: '1', key2: '2',key3:'3' };

const ruleDict = {
  key1: { type: 'equals', key: 'key1', value: '1' },
  key2: { type: 'equals', key: 'key2', value: '1' },
};

const result = evaluateRuleDict(data, ruleDict); // Returns: {ok:["key1"],fail:["key2"],undefined:["key3"]}
```

#### Parameters

- data (Record<string,string>): The data object to be used for evaluation.
- ruleDict (Record<string,Rule>): The rule dictionary object to be evaluated.

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
const data = { key1: '1', key2: '2',key3:'3' };

const ruleDict = {
  key1: { type: 'in', key: 'key1', value: ['1', '2', '3'] },
  key2: { type: 'in', key: 'key2', value: ['1', '2', '3'] },
};

const result = evaluateRuleDict(data, ruleDict); // Returns: {ok:["key1","key2"],fail:[],undefined:["key3"]}
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

dependentKeys (string[]): The dependent keys extracted from the rule object.

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

Convert rule object to source code.

#### Usage

```typescript
import { ruleToSource } from '@ncukondo/dynamic-form-rules';

const rule = { type: 'equals', key: 'label1', value: '1' };

const source = ruleToSource(rule); // Returns: "label1=1"
```

#### Parameters

- rule (Rule): The rule object to be evaluated.

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

## License

MIT
