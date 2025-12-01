import path from "node:path";
import fs from "node:fs";

export interface ConvexConfig {
  functions?: string;
  codegen?: {
    fileType?: string;
  };
}

/**
 * Reads the convex.json config file from the current working directory.
 * Returns null if the file doesn't exist.
 */
export const readConvexConfig = (): ConvexConfig | null => {
  const configPath = path.join(process.cwd(), "convex.json");

  if (!fs.existsSync(configPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(configPath, "utf8");
    return JSON.parse(raw) as ConvexConfig;
  } catch (err) {
    console.warn(`⚠️  Failed to parse convex.json:`, err);
    return null;
  }
};

/**
 * Gets the convex directory path from the config file.
 * Defaults to "convex" if not specified in the config.
 */
export const getConvexDir = (): string => {
  const config = readConvexConfig();
  const functionsPath = config?.functions ?? "convex";
  return path.resolve(functionsPath);
};

/**
 * Determines if TypeScript should be used based on the config file.
 * Returns true if fileType is "ts" in the codegen section.
 */
export const shouldUseTs = (): boolean => {
  const config = readConvexConfig();
  return config?.codegen?.fileType === "ts";
};
