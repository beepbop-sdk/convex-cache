// utils/extract-schema.ts
import path from "node:path";
import { pathToFileURL } from "node:url";

import type { AnyApi } from "convex/server";
import { getFunctionName } from "convex/server";
import type { ValidatorJSON } from "convex/values";

import { findFunctionReference } from "./find-fn-ref";
import type { SchemaEntry } from "../generate";

type HasReturnsJson = {
  __returnsJson?: ValidatorJSON;
};

const isConvexFn = (value: unknown): boolean => {
  if (!value || (typeof value !== "function" && typeof value !== "object")) {
    return false;
  }
  const maybeFn = value as { isQuery?: boolean; isPublic?: boolean };
  return Boolean(maybeFn.isQuery && maybeFn.isPublic);
};

const hasReturnsJson = (value: unknown): value is HasReturnsJson => {
  return !!value && (typeof value === "function" || typeof value === "object") && "__returnsJson" in (value as any);
};

export const extractSchema = async (file: string, api: AnyApi, convexDir: string): Promise<SchemaEntry[]> => {
  const entries: SchemaEntry[] = [];

  // Dynamically import the Convex module
  let mod: Record<string, unknown>;
  try {
    mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
  } catch (err) {
    console.warn(`⚠️  Failed to import ${file}:`, err);
    return entries;
  }

  const relativePath = path.relative(convexDir, file);
  const modulePath = relativePath.replace(/\.(ts|js)$/, "");

  for (const [exportName, value] of Object.entries(mod)) {
    if (!isConvexFn(value)) continue;
    if (!hasReturnsJson(value)) continue;

    const fnRef = findFunctionReference(api, modulePath, exportName);
    if (!fnRef) continue;

    const fnName = getFunctionName(fnRef);
    const schemaJson = (value as HasReturnsJson).__returnsJson!;

    entries.push({
      fnName,
      schemaJson: {
        returns: schemaJson,
      },
    });
  }

  return entries;
};
