import type { Command } from "commander";
import { loadTemplateManifest } from "../generation/manifest.js";
import { createPreview } from "../preview/preview.js";

export function registerPreview(program: Command): void {
  program
    .command("preview")
    .requiredOption("--manifest <path>", "template manifest")
    .option("--out <path>", "artifact output directory", ".tinker")
    .description("Create a checkpointed generation preview")
    .action(async (options: { readonly manifest: string; readonly out: string }) => {
      const manifest = await loadTemplateManifest(options.manifest);
      const result = await createPreview({ manifest, outDir: options.out });
      process.stdout.write(
        `preview ${result.preview.previewId} actions=${result.preview.actions.length}\n`,
      );
    });
}
