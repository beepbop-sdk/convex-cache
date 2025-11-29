import { spawn } from "node:child_process";

/**
 * Resolve a Bun binary or exit the process with a helpful message.
 **/
export const resolveBunOrExit = async (): Promise<string> => {
  const systemBunOk = await canRunBun("bun");
  if (systemBunOk) return "bun";

  console.error("⚠️  Bun is not installed. Please install Bun globally and then re-run this command.");
  console.error("Docs: https://bun.sh");
  process.exit(1);
};

/**
 * Check whether a given command behaves like Bun.
 */
const canRunBun = async (cmd: string): Promise<boolean> => {
  return await new Promise((resolve) => {
    const child = spawn(cmd, ["--version"], {
      stdio: ["ignore", "ignore", "ignore"],
    });

    child.on("exit", (code) => resolve(code === 0));
    child.on("error", () => resolve(false));
  });
};
