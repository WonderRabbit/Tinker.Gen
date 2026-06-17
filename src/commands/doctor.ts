import { constants } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import type { Command } from "commander";
import { getCodeGraphStatus } from "../codegraph/cli.js";
import { schemaFilesAvailable } from "../schemas/registry.js";
import { loadCommandConfig } from "./common.js";

export function registerDoctor(program: Command): void {
  program
    .command("doctor")
    .description("Report Tinker.Gen environment and integration health")
    .option("--json", "print JSON")
    .option("--config <path>", "path to tinker.config.json")
    .action(async (options: { readonly json?: boolean; readonly config?: string }) => {
      const loaded =
        options.config === undefined
          ? await loadCommandConfig({})
          : await loadCommandConfig({ config: options.config });
      const status = await getCodeGraphStatus({
        command: loaded.config.analysis.codegraph.command,
        projectPath: loaded.config.analysis.codegraph.projectPath,
        timeoutMs: loaded.config.analysis.codegraph.timeoutMs,
      });
      const report = {
        schemaVersion: "tinker.doctor.v1",
        node: { version: process.version, required: ">=22.5.0" },
        config: loaded.config,
        configSource: loaded.source,
        output: await outputDirectoryHealth(loaded.config.output.directory),
        schemas: { available: await schemaFilesAvailable() },
        codegraph: status,
      };
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    });
}

async function outputDirectoryHealth(path: string): Promise<{
  readonly directory: string;
  readonly writable: boolean;
  readonly error?: string;
}> {
  try {
    await mkdir(path, { recursive: true });
    await access(path, constants.W_OK);
    return { directory: path, writable: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { directory: path, writable: false, error: message };
  }
}
