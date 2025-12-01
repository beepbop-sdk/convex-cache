#!/usr/bin/env node
import { Command } from "commander";
import { dev } from "./fns/dev.js";
// import pkg from "../package.json" assert { type: "json" };  // optional improvement

const program = new Command();

program.name("convex-cache").description("Upload Convex functions & generate Zod schemas on change").version("0.1.0"); // or pkg.version

program
  .command("dev")
  .description("Runs `convex dev` and generates Zod schemas while watching for changes")
  .option("--schema-only", "Only generate schemas, skip running convex dev", false)
  .action(async (opts) => {
    await dev({ schemaOnly: opts.schemaOnly });
  });

// Let Commander show help by default if no args are provided
program.showHelpAfterError("(run with --help for usage information)");
program.showSuggestionAfterError();

// Use parseAsync so async commands propagate errors
program.parseAsync(process.argv).catch((err) => {
  console.error("\n❌ convex-cache failed:");
  if (err?.message) console.error("  " + err.message);
  else console.error(err);
  process.exit(1);
});
