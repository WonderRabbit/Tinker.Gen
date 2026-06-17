import type { Command } from "commander";
import { renderComponentScaffold } from "../generation/generator.js";
import { loadTemplateManifest } from "../generation/manifest.js";

export function registerGenerate(program: Command): void {
  program
    .command("generate")
    .requiredOption("--manifest <path>", "template manifest")
    .option("--dry-run", "print create-only actions without writing")
    .description("Render deterministic generator actions")
    .action(async (options: { readonly manifest: string; readonly dryRun?: boolean }) => {
      const manifest = await loadTemplateManifest(options.manifest);
      const actions = renderComponentScaffold(manifest);
      if (options.dryRun !== true) {
        process.stdout.write(
          "Use preview/apply to write files safely. Re-run with --dry-run for action output.\n",
        );
        return;
      }
      for (const action of actions) {
        process.stdout.write(
          `dry ${manifest.template.id} ${action.kind} ${action.path} ${action.sha256}\n`,
        );
      }
    });
}
