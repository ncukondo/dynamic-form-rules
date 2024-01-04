# Dynamic Form Rules

This package provides a set of utility functions for evaluating dynamic form rules.

## Table of Contents

- [Installation](#installation)
- [safeParseSource Function](#safeparsesource-function)
  - parse source code to rule object
- [safeParseObject Function](#safeparseobject-function)
  - parse unknown object to rule object
- [evaluateRule Function](#evaluaterule-function)
  - evaluate rule object
- [evaluateRuleDict Function](#evaluateruledict-function)
  - evaluate rule dictionary object
- [extractDependentKeys Function](#extractdependentkeys-function)
  - extract dependent keys from rule object
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

## safeParseSource Function

### Description

The `safeParseSource` function is a utility function used to safely parse source code defines dynamic form rule.

### Usage

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

- Parsing an "in" operator:

```typescript
const condition = safeParseSource("label1 in [1,2,3]");
// Returns: { ok: true, pos: 17, value: { type: "in", key: "label1", value: ["1", "2", "3"] } }
```

- Parsing a "not in" operator:

```typescript
const condition = safeParseSource("label1 notIn [1,2,3]");
// Returns: { ok: true, pos: 20, value: { type: "notIn", key: "label1", value: ["1", "2", "3"] } }
```

- Parsing an "equals" operator:

```typescript
const condition = safeParseSource("label1=1");
// Returns: { ok: true, pos: 8, value: { type: "equals", key: "label1", value: "1" } }
```

## safeParseObject Function

### Description

The `safeParseObject` function is a utility function used to safely parse unknown objects to rule object.

### Usage

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

- Parsing an "in" operator:

```typescript
const condition = safeParseObject({ type: 'in', key: 'label1', value: ['1', '2', '3'] });

// Returns: { ok: true, value: { type: "in", key: "label1", value: ["1", "2", "3"] } }
```

- Parsing a "not in" operator:

```typescript
const condition = safeParseObject({ type: 'notIn', key: 'label1', value: ['1', '2', '3'] });

// Returns: { ok: true, value: { type: "notIn", key: "label1", value: ["1", "2", "3"] } }
```

- Parsing an "equals" operator:

```typescript
const condition = safeParseObject({ type: 'equals', key: 'label1', value: '1' });

// Returns: { ok: true, value: { type: "equals", key: "label1", value: "1" } }
```

## evaluateRule Function

### Description

The `evaluateRule` function is a utility function used to evaluate a rule object.

### Usage

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

- Evaluating an "equals" operator:

```typescript
const rule = { type: 'equals', key: 'label1', value: '1' };
const data = { label1: '1' };

const result = evaluateRule(rule, data); // Returns: true
```

## evaluateRuleDict Function

### Description

The `evaluateRuleDict` function is a utility function used to evaluate a rule dictionary object.

### Usage

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

## extractDependentKeys Function

### Description

The `extractDependentKeys` function is a utility function used to extract dependent keys from a rule object.

### Usage

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

## License

MIT
