#!/usr/bin/env bun

import fg from "fast-glob";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";
import type { ZodType } from "zod";
import type { FunctionReference } from "convex/server";
import { getFunctionName } from "convex/server";
import { ZOD_JSON, type JsonSchema } from "@bigbang-sdk/zod-json";

type AnyApi = Record<string, unknown>;

type SchemaEntry = {
  fnName: string;
  schema: {
    output: JsonSchema;
  };
};

/**
 * Load the host app's convex/_generated/api module.
 * Bun can import both TS and JS directly.
 */
const loadConvexApi = async (convexDir: string): Promise<AnyApi | null> => {
  const candidates = [
    path.join(convexDir, "_generated", "api.mjs"),
    path.join(convexDir, "_generated", "api.js"),
    path.join(convexDir, "_generated", "api.cjs"),
    path.join(convexDir, "_generated", "api.ts"),
  ];

  const existing = candidates.find((p) => fs.existsSync(p));
  if (!existing) {
    console.warn(["⚠️  No convex/_generated/api.{ts,js,mjs,cjs} found in this project.", '⚠️  Skipping schema extraction. Run "npx convex dev" or "npx convex codegen" first.'].join("\n"));
    return null;
  }

  try {
    const mod = await import(pathToFileURL(existing).href);
    if (!("api" in mod)) {
      console.warn(`⚠️  Found ${existing} but it does not export "api". Skipping.`);
      return null;
    }
    return (mod as { api: AnyApi }).api;
  } catch (err) {
    console.warn(`⚠️  Failed to import ${existing}:`, err);
    return null;
  }
};

/**
 * Walk the convex API object to find a FunctionReference.
 */
const findFunctionReference = (api: AnyApi, modulePath: string, exportName: string): FunctionReference<any, any> | undefined => {
  try {
    // Handle both "/" and "\" so this works on Windows too.
    const parts = modulePath.split(/[\\/]/).filter(Boolean);
    if (parts.length === 0) return undefined;

    let current: any = api;

    for (const part of parts) {
      if (!current || typeof current !== "object") return undefined;
      current = current[part];
      if (!current) return undefined;
    }

    if (exportName === "default") {
      return current.default || current;
    }

    return current[exportName] as FunctionReference<any, any> | undefined;
  } catch (error) {
    console.warn(`Failed to find function reference for ${modulePath}.${exportName}:`, error);
    return undefined;
  }
};

/**
 * Find all Convex source files under convex/, excluding generated ones.
 */
const discoverConvexSourceFiles = async (convexDir: string): Promise<string[]> => {
  return fg("**/*.ts", {
    cwd: convexDir,
    ignore: ["_generated/**/*.ts"],
    absolute: true,
  });
};

const isConvexFn = (value: unknown): boolean => {
  if (!value || (typeof value !== "function" && typeof value !== "object")) {
    return false;
  }
  const maybeFn = value as { isQuery?: boolean; isPublic?: boolean };
  return Boolean(maybeFn.isQuery && maybeFn.isPublic);
};

const hasZReturn = (value: unknown): value is { __zReturn: ZodType } => {
  return !!value && (typeof value === "function" || typeof value === "object") && "__zReturn" in (value as any) && Boolean((value as any).__zReturn);
};

/**
 * Given a file path and the API, extract all {fnName, schema} entries
 * for functions in that file that have a __zReturn annotation.
 */
const extractSchemasFromFile = async (file: string, api: AnyApi, convexDir: string): Promise<SchemaEntry[]> => {
  const entries: SchemaEntry[] = [];

  let mod: Record<string, unknown>;
  try {
    mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
  } catch (err) {
    console.warn(`⚠️  Failed to import ${file}:`, err);
    return entries;
  }

  const relativePath = path.relative(convexDir, file);
  const modulePath = relativePath.replace(/\.ts$/, "");

  for (const [exportName, value] of Object.entries(mod)) {
    if (!hasZReturn(value)) continue;
    if (!isConvexFn(value)) continue;

    const zReturn = value.__zReturn;

    const fnRef = findFunctionReference(api, modulePath, exportName);
    if (!fnRef) continue;

    const fnName = getFunctionName(fnRef);

    try {
      const jsonSchema = ZOD_JSON.zodToJson(zReturn, { name: fnName });
      entries.push({
        fnName,
        schema: {
          output: jsonSchema,
        },
      });
    } catch (error) {
      console.error(`Error converting schema for ${fnName}:`, error);
    }
  }

  return entries;
};

/**
 * Turn schema entries into the content of convex/_generated/zSchemas.js
 */
const buildSchemasFileContent = (schemaEntries: SchemaEntry[]): string => {
  // Ensure deterministic ordering by sorting by fnName.
  const sorted = [...schemaEntries].sort((a, b) => a.fnName.localeCompare(b.fnName));

  const schemaMapEntries = sorted.map(({ fnName, schema }) => `  "${fnName}": ${JSON.stringify(schema, null, 2)},`);

  return `// Auto-generated file - do not edit manually
// This file contains JSON Schema definitions converted from Zod schemas

export const schemaMap = {
${schemaMapEntries.join("\n")}
};
`;
};

/**
 * Write the schemas file into the host repo's convex/_generated directory.
 */
const writeSchemasFile = (content: string, convexDir: string): void => {
  const hostConvexZDir = path.join(convexDir, "_generated");

  fs.mkdirSync(hostConvexZDir, { recursive: true });
  fs.writeFileSync(path.join(hostConvexZDir, "schemaMap.js"), content);
};

const resolveConvexDirFromArgs = (args: string[]): string => {
  let convexDir = path.join(process.cwd(), "convex");

  const idx = args.indexOf("--convexDir");
  if (idx !== -1 && args[idx + 1]) {
    convexDir = path.resolve(args[idx + 1] as string);
  }

  return convexDir;
};

const main = async (): Promise<void> => {
  const args = process.argv.slice(2);
  const convexDir = resolveConvexDirFromArgs(args);

  if (!fs.existsSync(convexDir)) {
    console.warn('⚠️  No "convex" directory found in this project. Skipping schema generation.');
    return;
  }

  const api = await loadConvexApi(convexDir);
  if (!api) return;

  const files = await discoverConvexSourceFiles(convexDir);

  // Extract schemas from all files in parallel
  const perFileEntries = await Promise.all(files.map((file) => extractSchemasFromFile(file, api, convexDir)));

  // Flatten + dedupe by fnName (last one wins)
  const byName = new Map<string, SchemaEntry>();
  for (const list of perFileEntries) {
    for (const entry of list) {
      byName.set(entry.fnName, entry);
    }
  }

  const schemaEntries = [...byName.values()];

  if (schemaEntries.length === 0) {
    console.warn("⚠️  No Zod-returning Convex functions found.");
    return;
  }

  const content = buildSchemasFileContent(schemaEntries);
  writeSchemasFile(content, convexDir);
};

main().catch((err) => {
  console.error("⚠️  Bun generate-z-schema failed:", err);
  process.exit(1);
});
