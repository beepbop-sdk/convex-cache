import path from "node:path";
import { fileURLToPath } from "node:url";
import { ShellRunner, ShellRunnerError } from "../../lib/shell-runner.js";
import { runCmd, runFileCmd } from "../../lib/package-cmds.js";

export interface ConvexRunnerOptions {
  skipConvex?: boolean;
}

/**
 * Orchestrates running the Convex CLI and regenerating the Zod schema.
 * Uses ShellRunner under the hood and ensures only one run happens at a time.
 */
export class ConvexRunner {
  private readonly tasks = new ShellRunner();
  private readonly skipConvex: boolean;
  private isRunning = false;

  constructor({ skipConvex = false }: ConvexRunnerOptions) {
    this.skipConvex = skipConvex;
  }

  get running(): boolean {
    return this.isRunning;
  }

  /**
   * Cancel any in-flight Convex task run.
   * This will cause the current runOnce() to reject with a "cancelled" error.
   */
  cancel = (): void => {
    if (!this.isRunning) return;
    this.tasks.cancelAll();
  };

  private resolveCurrentPath = (): string => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    return __dirname;
  };

  /**
   * Run the Convex command once, then regenerate the Zod schema.
   * If a run is already in progress, this is a no-op.
   * If skipConvex is true, skips the Convex command and only generates schemas.
   */
  runOnce = async (): Promise<void> => {
    if (this.isRunning) return;

    this.isRunning = true;
    this.tasks.resetCancelled();

    try {
      if (!this.skipConvex) {
        const convexCmd = await runCmd("convex dev --once");

        await this.tasks.run(convexCmd, {
          kind: "convex",
          label: "➡️  Uploading functions to Convex...",
          successMessage: "✅ Convex functions uploaded",
        });
      }

      const generateSchemaPath = path.join(this.resolveCurrentPath(), "generate-z-schema/generate.js");
      const generateSchemaCmd = await runFileCmd(generateSchemaPath);

      await this.tasks.run(generateSchemaCmd, {
        kind: "schema",
        label: "➡️  Generating Zod schemas...",
        successMessage: "✅  Zod schemas generated",
      });

      console.log(`\n👀 Watching for any changes...`);
    } catch (err) {
      // Ignore cancellations from ShellRunner, log everything else.
      if (!(err instanceof ShellRunnerError && err.message === "cancelled") && (typeof err !== "object" || err === null || (err as any).message !== "cancelled")) {
        console.error("⚠️  Convex run failed:", err);
      }
    } finally {
      this.isRunning = false;
      this.tasks.resetCancelled();
    }
  };
}
