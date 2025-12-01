// src/cli/fns/dev.ts
import { DirWatcher } from "../lib/dir-watcher.js";
import { ConvexRunner } from "./fns/convex-runner.js";
import { runCmd } from "../lib/package-cmds.js";
import { getConvexDir } from "../lib/convex-config.js";

interface DevOptions {
  /** If true, only generate schemas and skip running convex dev. */
  schemaOnly?: boolean;
}

/**
 * Start a one-off Convex dev run and then watch the Convex directory
 * for changes, re-running Convex + schema generation on each change.
 * If schemaOnly is true, skip the Convex dev step and only generate schemas.
 */
export const dev = async ({ schemaOnly = false }: DevOptions): Promise<void> => {
  const convexRunner = new ConvexRunner({
    skipConvex: schemaOnly,
  });

  // Initial run – if this fails, don't bother watching.
  try {
    await convexRunner.runOnce();
  } catch (err) {
    console.error("⚠️  Initial run failed. Not starting watcher.", err);
    process.exit(1);
  }

  const shouldIgnore = (rel: string): boolean => rel.startsWith("_generated") || rel.startsWith(".") || rel.endsWith("~") || rel.endsWith(".swp");

  // Queue rebuilds so we never have overlapping runs.
  let rebuildPromise: Promise<void> = Promise.resolve();

  const watcher = new DirWatcher({
    rootDir: getConvexDir(),
    recursive: true,
    debounceMs: 200,
    shouldIgnore,
    onChange: async () => {
      const previous = rebuildPromise;

      rebuildPromise = (async () => {
        // Cancel whatever is currently running (if anything),
        // then wait for the previous run to fully settle before starting a new one.
        convexRunner.cancel();
        await previous.catch(() => {
          // ignore errors from previous run, they are logged elsewhere
        });
        await convexRunner.runOnce();
      })();

      // Make DirWatcher wait for the rebuild to finish (for nicer logs).
      await rebuildPromise;
    },
  });

  watcher.start();

  const cleanup = () => {
    watcher.stop();
    convexRunner.cancel();
  };

  // Graceful shutdown handling.
  process.on("SIGINT", () => {
    cleanup();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });
};
