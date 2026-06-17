import type { Command } from "commander";
import { applyPreview } from "../apply/apply.js";

export function registerApply(program: Command): void {
  program
    .command("apply")
    .option("--preview <id>", "preview id")
    .option("--out <path>", "artifact output directory", ".tinker")
    .description("Apply a checkpointed preview with create-only safety")
    .action(async (options: { readonly preview?: string; readonly out: string }) => {
      const written = await applyPreview({ previewId: options.preview ?? "", outDir: options.out });
      process.stdout.write(`applied ${written.length} files\n`);
    });
}
