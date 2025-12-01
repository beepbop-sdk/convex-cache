import { AnyApi } from "convex/server";
import { pathToFileURL } from "node:url";
import fg from "fast-glob";
import fs from "node:fs";
import path from "node:path";
import { getConvexDir } from "../../../../lib/convex-config.js";

export const loadConvex = async () => {
  const convexDir = getConvexDir();

  if (!fs.existsSync(convexDir)) {
    console.warn('⚠️  No "convex" directory found in this project. Skipping schema generation.');
    return;
  }

  const api = await loadConvexApi(convexDir);
  if (!api) return;

  const files = await findConvexSourceFiles(convexDir);

  return { convexDir, api, files };
};

export const loadConvexApi = async (convexDir: string): Promise<AnyApi | null> => {
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

const findConvexSourceFiles = async (convexDir: string): Promise<string[]> => {
  return fg("**/*.{ts,js}", {
    cwd: convexDir,
    ignore: ["_generated/**/*.{ts,js}"],
    absolute: true,
  });
};
