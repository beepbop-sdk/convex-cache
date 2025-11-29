import { ShellRunner, ShellRunnerError } from "../../lib/shell-runner.js";
import { generateZSchema } from "./generate-z-schema-runner.js";

export interface ConvexRunnerOptions {
  convexCmd: string;
  convexDir: string;
}

/**
 * Orchestrates running the Convex CLI and regenerating the Zod schema.
 * Uses ShellRunner under the hood and ensures only one run happens at a time.
 */
export class ConvexRunner {
  private readonly tasks = new ShellRunner();
  private readonly convexCmd: string;
  private readonly convexDir: string;
  private isRunning = false;

  constructor({ convexCmd, convexDir }: ConvexRunnerOptions) {
    this.convexCmd = convexCmd;
    this.convexDir = convexDir;
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

  /**
   * Run the Convex command once, then regenerate the Zod schema.
   * If a run is already in progress, this is a no-op.
   */
  runOnce = async (): Promise<void> => {
    if (this.isRunning) return;

    this.isRunning = true;
    this.tasks.resetCancelled();

    try {
      await this.tasks.run(this.convexCmd, {
        kind: "convex",
        label: "➡️  Uploading functions to Convex...",
        successMessage: "✅ Convex functions uploaded",
      });

      await generateZSchema({ convexDir: this.convexDir });

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
