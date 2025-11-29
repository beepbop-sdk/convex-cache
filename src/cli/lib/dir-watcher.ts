import fs from "fs";
import path from "path";

export interface DirWatcherOptions {
  /** Absolute or relative path to the directory to watch. */
  rootDir: string;
  /** Whether to watch subdirectories as well. Defaults to true. */
  recursive?: boolean;
  /** Debounce time in milliseconds before invoking `onChange`. Defaults to 200ms. */
  debounceMs?: number;
  /** Function to determine if a relative path should be ignored. */
  shouldIgnore?: (relativePath: string) => boolean;
  /**
   * Callback invoked when a (debounced) change is detected.
   * Receives the relative path (from `rootDir`) of the changed file.
   */
  onChange: (relativePath: string) => void | Promise<void>;
}

/**
 * A simple debounced directory watcher built on top of `fs.watch`.
 * It watches a root directory (optionally recursively) and calls `onChange`
 * after changes settle for `debounceMs` milliseconds.
 */
export class DirWatcher {
  private readonly rootDir: string;
  private readonly rootLabel: string;
  private readonly recursive: boolean;
  private readonly debounceMs: number;
  private readonly shouldIgnore?: (relativePath: string) => boolean;
  private readonly onChange: (relativePath: string) => void | Promise<void>;

  private debounceTimer: NodeJS.Timeout | null = null;
  private lastRelPath: string | null = null;
  private watcher: fs.FSWatcher | null = null;
  private started = false;

  constructor(options: DirWatcherOptions) {
    const { rootDir, recursive = true, debounceMs = 200, shouldIgnore, onChange } = options;

    // Normalize to an absolute path to avoid ambiguity
    this.rootDir = path.resolve(rootDir);
    this.rootLabel = path.basename(this.rootDir);
    this.recursive = recursive;
    this.debounceMs = debounceMs;
    this.shouldIgnore = shouldIgnore;
    this.onChange = onChange;
  }

  /**
   * Start watching the directory.
   * Exits the process if the root directory does not exist or watcher fails.
   */
  start = (): void => {
    if (this.started) return;

    if (!fs.existsSync(this.rootDir)) {
      console.error(`watch root not found: ${this.rootDir}`);
      process.exit(1);
    }

    try {
      this.watcher = fs.watch(this.rootDir, { recursive: this.recursive }, (eventType, filename) => {
        this.handleFsEvent(eventType, filename);
      });

      this.watcher.on("error", (err) => {
        console.error(`fs.watch error for ${this.rootDir}:`, err);
        this.stop();
        // Keep behavior simple & explicit: fail hard on watcher errors
        process.exit(1);
      });

      this.started = true;
    } catch (err) {
      console.error(`Failed to start fs.watch on ${this.rootDir} (recursive=${this.recursive}):`, err);
      process.exit(1);
    }
  };

  /**
   * Stop watching the directory and clear any pending debounce timer.
   */
  stop = (): void => {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.lastRelPath = null;
    this.started = false;
  };

  /**
   * Internal handler for fs.watch events.
   * Keeps behavior identical to the original implementation:
   * - debounce on any change
   * - call `onChange` once with the last changed relative path
   */
  private handleFsEvent(_eventType: string, filename: string | Buffer | null): void {
    if (!filename) return;

    const rel = filename.toString();

    if (this.shouldIgnore && this.shouldIgnore(rel)) return;

    this.lastRelPath = rel;

    console.log(`\n --------- Change detected in ${this.rootLabel}/: ${rel} ---------`);

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      const pathToReport = this.lastRelPath;
      if (!pathToReport) return;

      void (async () => {
        try {
          await this.onChange(pathToReport);
        } catch (err) {
          console.error("Error in DirWatcher onChange handler:", err);
        }
      })();
    }, this.debounceMs);
  }
}
