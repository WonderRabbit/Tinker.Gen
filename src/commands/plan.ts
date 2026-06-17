import { join } from "node:path";
import type { Command } from "commander";
import { loadTemplateManifest, saveTemplateManifest } from "../generation/manifest.js";

export function registerPlan(program: Command): void {
  program
    .command("plan")
    .requiredOption("--manifest <path>", "template manifest")
    .option("--out <path>", "artifact output directory", ".tinker")
    .description("Validate and persist a template manifest")
    .action(async (options: { readonly manifest: string; readonly out: string }) => {
      const manifest = await loadTemplateManifest(options.manifest);
      await saveTemplateManifest(join(options.out, "template-manifest.json"), manifest);
      process.stdout.write(
        `planned ${manifest.template.id} -> ${join(options.out, "template-manifest.json")}\n`,
      );
    });
}
