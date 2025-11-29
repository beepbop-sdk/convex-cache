// src/cli/fns/dev.ts

import path from "node:path";
import { DirWatcher } from "../lib/dir-watcher.js";
import { ConvexRunner } from "./fns/convex-runner.js";
import { runCmd } from "../lib/package-cmds.js";

interface DevOptions {
  /** Path to the Convex directory (relative or absolute). */
  convexDir: string;
}

/**
 * Start a one-off Convex dev run and then watch the Convex directory
 * for changes, re-running Convex + schema generation on each change.
 */
export const dev = async ({ convexDir }: DevOptions): Promise<void> => {
  const absoluteDir = path.resolve(convexDir);

  const convexRunner = new ConvexRunner({
    convexCmd: await runCmd("convex dev --once"),
    convexDir: absoluteDir,
  });

  // Initial run – if this fails, don't bother watching.
  try {
    await convexRunner.runOnce();
  } catch (err) {
    console.error("⚠️  Initial Convex dev run failed. Not starting watcher.", err);
    process.exit(1);
  }

  const shouldIgnore = (rel: string): boolean => rel.startsWith("_generated") || rel.startsWith(".") || rel.endsWith("~") || rel.endsWith(".swp");

  // Queue rebuilds so we never have overlapping runs.
  let rebuildPromise: Promise<void> = Promise.resolve();

  const watcher = new DirWatcher({
    rootDir: absoluteDir,
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
