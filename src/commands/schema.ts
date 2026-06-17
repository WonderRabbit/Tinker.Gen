import type { Command } from "commander";
import { schemaListText, validateByKind } from "../schemas/registry.js";

export function registerSchema(program: Command): void {
  const schema = program.command("schema").description("Inspect and validate Tinker.Gen schemas");

  schema
    .command("list")
    .description("List artifact schemas")
    .action(async () => {
      process.stdout.write(`${await schemaListText()}\n`);
    });

  schema
    .command("validate")
    .requiredOption("--kind <kind>", "schema kind")
    .requiredOption("--file <path>", "JSON file to validate")
    .description("Validate a JSON file against a named schema")
    .action(async (options: { readonly kind: string; readonly file: string }) => {
      await validateByKind(options.kind, options.file);
      process.stdout.write(`valid ${options.kind}: ${options.file}\n`);
    });
}
