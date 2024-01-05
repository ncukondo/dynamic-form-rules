import { Rule } from "./schema";

const encode = (str: string): string => {
  if (str.match(/^[a-zA-Z0-9_]+$/)) return str;
  if (str.includes('"')) return `'${str}'`;
  return `"${str}"`;
};

const ruleToSource = (rule: Rule): string => {
  const type = rule.type;
  switch (type) {
    case "and":
      return rule.children.map(ruleToSource).join(" and ");
    case "or":
      return `(${rule.children.map(ruleToSource).join(" or ")})`;
    case "not":
      return `not(${ruleToSource(rule.child)})`;
    case "equals":
      return `${encode(rule.key)}=${encode(rule.value)}`;
    case "notEquals":
      return `${encode(rule.key)}<>${encode(rule.value)}`;
    case "in":
      return `${encode(rule.key)} in [${rule.value.map(encode).join(",")}]`;
    case "notIn":
      return `${encode(rule.key)} not in [${rule.value.map(encode).join(",")}]`;
    case "includes":
      return `${encode(rule.key)} includes ${encode(rule.value)}`;
    case "notIncludes":
      return `${encode(rule.key)} not includes ${encode(rule.value)}`;
    case "matches":
      return `${encode(rule.key)} matches ${encode(rule.value)}`;
    case "notMatches":
      return `${encode(rule.key)} not matches ${encode(rule.value)}`;
    default:
      throw new Error(`unknown condition type: ${type}`);
  }
};

export { ruleToSource };
