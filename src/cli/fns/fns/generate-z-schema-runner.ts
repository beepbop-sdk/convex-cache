import { spawn, type SpawnOptions } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveBunOrExit } from "../../lib/resolve-bun.js";

export interface GenerateZSchemaOptions {
  /** Path to the Convex directory (typically project/convex). */
  convexDir: string;
}

/**
 * Resolve the path to the Bun-side generator script.
 * After build, this should end up next to this file as generate-z-schema.js.
 */
const resolveBunScriptPath = (): string => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const scriptPath = path.join(__dirname, "generate-z-schema.js");
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Could not find Bun generator script at ${scriptPath}. ` + `Make sure the build step emitted generate-z-schema.js.`);
  }
  return scriptPath;
};

const runChild = (command: string, args: string[], options: SpawnOptions): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, options);

    child.on("exit", (code, signal) => {
      if (code === 0) {
        return resolve();
      }
      reject(new Error(`${command} ${args.join(" ")} failed (code=${code ?? "unknown"}, signal=${signal ?? "none"})`));
    });

    child.on("error", (err) => {
      reject(err);
    });
  });

/**
 * Node-side wrapper: delegates actual work to a Bun script.
 * Bun then imports Convex TS code directly and writes convex/_generated/zSchemas.js.
 */
export const generateZSchema = async ({ convexDir }: GenerateZSchemaOptions): Promise<void> => {
  await resolveBunOrExit();

  const bunScript = resolveBunScriptPath();

  console.log("\n➡️  Generating Zod schemas...");

  await runChild("bun", [bunScript, "--convexDir", convexDir], {
    stdio: "inherit",
    env: {
      ...process.env,
    },
  });

  console.log("✅  Zod schemas generated");
};
