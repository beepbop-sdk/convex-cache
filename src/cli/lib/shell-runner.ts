import { spawn, type ChildProcess, type SpawnOptions } from "child_process";

export type TaskKind = string;

export interface ShellRunOptions {
  /** Human-readable label for logging. */
  label: string;
  /** Logical kind/category for the task, used as a key in `currentProcs`. */
  kind: TaskKind;
  /** Optional message to log when the command succeeds. */
  successMessage?: string;
  /**
   * Whether to run the command through a shell.
   * Defaults to true.
   */
  shell?: boolean;
  /**
   * Extra spawn options (cwd, env, etc.).
   * `shell` and `stdio` are controlled by ShellRunner.
   */
  spawnOptions?: Omit<SpawnOptions, "shell" | "stdio">;
  /**
   * Optional AbortSignal for per-run cancellation.
   */
  abortSignal?: AbortSignal;
}

export class ShellRunnerError extends Error {
  constructor(
    message: string,
    public readonly kind: TaskKind,
    public readonly code: number | null = null,
    public readonly signal: NodeJS.Signals | null = null
  ) {
    super(message);
    this.name = "ShellRunnerError";
  }
}

/**
 * ShellRunner spawns shell commands, tracks them by "kind",
 * and allows cancelling all running processes.
 */
export class ShellRunner {
  private readonly currentProcs = new Map<TaskKind, ChildProcess>();
  private cancelled = false;

  get isCancelled(): boolean {
    return this.cancelled;
  }

  /**
   * Reset the internal "cancelled" flag back to false.
   * Does not restart any cancelled processes; it only affects
   * how subsequent runs behave.
   */
  resetCancelled = (): void => {
    this.cancelled = false;
  };

  /**
   * Run a shell command with the given options.
   *
   * Resolves on successful exit code (0), rejects otherwise,
   * or if the runner is cancelled / AbortSignal aborts / a process of this kind is already running.
   */
  run = async (command: string, options: ShellRunOptions): Promise<void> => {
    const { label, kind, successMessage, shell = true, spawnOptions, abortSignal } = options;

    // Fast-fail if globally cancelled or already aborted.
    if (this.cancelled) {
      throw new ShellRunnerError("ShellRunner is cancelled", kind);
    }
    if (abortSignal?.aborted) {
      throw new ShellRunnerError("Run aborted before start", kind);
    }

    // Enforce single process per kind.
    if (this.currentProcs.has(kind)) {
      throw new ShellRunnerError(`A task of kind "${kind}" is already running`, kind);
    }

    console.log(`\n${label}`);

    return new Promise<void>((resolve, reject) => {
      const child = spawn(command, {
        shell,
        stdio: ["inherit", "inherit", "inherit"],
        ...spawnOptions,
      });

      this.currentProcs.set(kind, child);

      // Support AbortSignal-based cancellation
      const abortHandler = () => {
        if (!child.killed) {
          child.kill("SIGINT");
        }
      };
      if (abortSignal) {
        abortSignal.addEventListener("abort", abortHandler, { once: true });
      }

      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;

        // Cleanup
        if (this.currentProcs.get(kind) === child) {
          this.currentProcs.delete(kind);
        }
        if (abortSignal) {
          abortSignal.removeEventListener("abort", abortHandler);
        }

        fn();
      };

      child.on("exit", (code, signal) => {
        settle(() => {
          if (this.cancelled || abortSignal?.aborted) {
            return reject(new ShellRunnerError("cancelled", kind, code, signal));
          }

          if (code === 0) {
            if (successMessage) {
              console.log(successMessage);
            }
            return resolve();
          }

          console.error(`❌ ${label} failed (code=${code ?? "unknown"}, signal=${signal ?? "none"})`);
          reject(new ShellRunnerError(`${label} failed with code ${code ?? "unknown"}`, kind, code, signal));
        });
      });

      child.on("error", (err) => {
        settle(() => {
          console.error(`❌ Failed to start ${label}:`, err);
          reject(err);
        });
      });
    });
  };

  /**
   * Mark the runner as cancelled and send the given signal
   * (default SIGINT) to all tracked child processes.
   */
  cancelAll = (signal: NodeJS.Signals = "SIGINT"): void => {
    this.cancelled = true;

    for (const child of this.currentProcs.values()) {
      try {
        child.kill(signal);
      } catch {
        // ignore
      }
    }
  };

  /**
   * Cancel a single running task kind, if present.
   */
  cancelKind = (kind: TaskKind, signal: NodeJS.Signals = "SIGINT"): void => {
    const child = this.currentProcs.get(kind);
    if (!child) return;
    try {
      child.kill(signal);
    } catch {
      // ignore
    }
  };
}
