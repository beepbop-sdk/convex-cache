// lib/build-schema-map.ts
import path from "node:path";
import fs from "node:fs";
import type { AnyApi } from "convex/server";
import type { SchemaEntry } from "../generate";
import { extractSchema } from "../utils/extract-schema";
import { buildSchemaFileTs, buildSchemaFileJs, buildSchemaDtsFile } from "../utils/build-schema-file";
import { shouldUseTs } from "../../../../lib/convex-config.js";

export const buildSchemaMap = async ({ files, api, convexDir }: { files: string[]; api: AnyApi; convexDir: string }) => {
  const perFileEntries = await Promise.all(files.map((file) => extractSchema(file, api, convexDir)));

  const byName = new Map<string, SchemaEntry>();
  for (const list of perFileEntries) {
    for (const entry of list) {
      byName.set(entry.fnName, entry);
    }
  }

  const schemaEntries = [...byName.values()];

  if (schemaEntries.length === 0) {
    console.warn("⚠️  No Convex functions with `__returnsJson` found.");
    return;
  }

  writeSchemasFile(schemaEntries, convexDir);
};

// ---------- file writer ----------

export const writeSchemasFile = (schemaEntries: SchemaEntry[], convexDir: string): void => {
  const hostConvexGeneratedDir = path.join(convexDir, "_generated");
  fs.mkdirSync(hostConvexGeneratedDir, { recursive: true });

  let useTs = shouldUseTs();

  if (useTs) {
    // TS project: generate schemaMap.ts only
    const tsContent = buildSchemaFileTs(schemaEntries);
    fs.writeFileSync(path.join(hostConvexGeneratedDir, "schemaMap.ts"), tsContent);
  } else {
    // Default: generate schemaMap.js + schemaMap.d.ts
    const jsContent = buildSchemaFileJs(schemaEntries);
    const dtsContent = buildSchemaDtsFile();
    fs.writeFileSync(path.join(hostConvexGeneratedDir, "schemaMap.js"), jsContent);
    fs.writeFileSync(path.join(hostConvexGeneratedDir, "schemaMap.d.ts"), dtsContent);
  }
};
