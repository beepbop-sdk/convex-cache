// utils/extract-schema.ts
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { AnyApi } from "convex/server";
import { getFunctionName } from "convex/server";
import type { ValidatorJSON } from "convex/values";

import { findFunctionReference } from "./find-fn-ref";
import type { SchemaEntry } from "../generate";

type ConvexQueryExport = {
  isQuery?: boolean;
  isPublic?: boolean;
  exportReturns?: () => string | null;
};

/**
 * A Convex query we can inspect:
 * - must be isQuery
 * - must be isPublic
 * - must have exportReturns() function
 */
const isConvexFn = (value: unknown): value is ConvexQueryExport => {
  if (!value || (typeof value !== "function" && typeof value !== "object")) {
    return false;
  }
  const v = value as any;
  return Boolean(v.isQuery && v.isPublic && typeof v.exportReturns === "function");
};

/**
 * Returns true if exportReturns() yields a non-null string.
 * Returns false if null OR if calling exportReturns() throws.
 */
const fetchReturnsString = (value: ConvexQueryExport): string | null => {
  try {
    const result = value.exportReturns?.();
    return typeof result === "string" && result.length > 0 ? result : null;
  } catch {
    return null;
  }
};

/**
 * Parse returnsJsonString → ValidatorJSON
 * Returns null on parse error.
 */
const parseReturnsValidatorJson = ({ returnsString, fnName }: { returnsString: string; fnName: string }) => {
  try {
    return JSON.parse(returnsString) as ValidatorJSON;
  } catch (err) {
    console.warn(`⚠️ Failed to parse return JSON for ${fnName}\nRaw: ${returnsString}`, err);
    return null;
  }
};

export const extractSchema = async (file: string, api: AnyApi, convexDir: string): Promise<SchemaEntry[]> => {
  const entries: SchemaEntry[] = [];

  // Load module dynamically
  let mod: Record<string, unknown>;
  try {
    mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
  } catch (err) {
    console.warn(`⚠️ Failed to import ${file}:`, err);
    return entries;
  }

  const relativePath = path.relative(convexDir, file);
  const modulePath = relativePath.replace(/\.(ts|js)$/, "");

  for (const [exportName, value] of Object.entries(mod)) {
    // Check if the value is a Convex query function
    if (!isConvexFn(value)) continue;

    // Fetch the returns value as a string
    const returnsString = fetchReturnsString(value);
    if (!returnsString) continue;

    // Find the function reference
    const fnRef = findFunctionReference(api, modulePath, exportName);
    if (!fnRef) continue;

    // Get the function name
    const fnName = getFunctionName(fnRef);

    // Parse the returns value as a ValidatorJSON
    const returnsValidatorJson = parseReturnsValidatorJson({ returnsString, fnName });
    if (!returnsValidatorJson) continue;

    entries.push({
      fnName,
      schemaJson: {
        returns: returnsValidatorJson,
      },
    });
  }

  return entries;
};
