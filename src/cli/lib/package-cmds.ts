import { resolveBunOrExit } from "./resolve-bun.js";

/**
 * Produce a command that runs a file with Bun.
 * Ensures Bun is available before returning.
 */
export const runFileCmd = async (filePath: string): Promise<string> => {
  await resolveBunOrExit();
  return `bun run ${filePath}`;
};

/**
 * Produce a command that runs a CLI via Bunx.
 * Ensures Bun is available before returning.
 */
export const runCmd = async (cmd: string): Promise<string> => {
  await resolveBunOrExit();
  return `bunx ${cmd}`;
};
