import type { SchemaEntry } from "../generate";

/**
 * TypeScript version: used when convex.json has `"fileType": "ts"`.
 */
export const buildSchemaFileTs = (schemaEntries: SchemaEntry[]): string => {
  // Ensure deterministic ordering by sorting by fnName.
  const sorted = [...schemaEntries].sort((a, b) => a.fnName.localeCompare(b.fnName));

  const schemaMapEntries = sorted.map(({ fnName, schemaJson }) => `  "${fnName}": ${JSON.stringify(schemaJson, null, 2)},`);

  return `// Auto-generated file - do not edit manually
// This file contains Convex ValidatorJSON definitions derived from \`returns\` in vQuery definitions.
import type { T_SchemaMap } from "convex-cache";

export const schemaMap: T_SchemaMap = {
${schemaMapEntries.join("\n")}
};
  `;
};

/**
 * JavaScript version: default when not TypeScript.
 */
export const buildSchemaFileJs = (schemaEntries: SchemaEntry[]): string => {
  const sorted = [...schemaEntries].sort((a, b) => a.fnName.localeCompare(b.fnName));

  const schemaMapEntries = sorted.map(({ fnName, schemaJson }) => `  "${fnName}": ${JSON.stringify(schemaJson, null, 2)},`);

  return `// Auto-generated file - do not edit manually
// This file contains Convex ValidatorJSON definitions derived from \`returns\` in vQuery definitions.

export const schemaMap = {
${schemaMapEntries.join("\n")}
};
  `;
};

/**
 * Declaration file for JS projects: just types.
 */
export const buildSchemaDtsFile = (): string => {
  return `// Auto-generated file - do not edit manually
// Type declarations for the generated schemaMap (ValidatorJSON per function).

import type { T_SchemaMap } from "convex-cache";

export declare const schemaMap: T_SchemaMap;
`;
};
