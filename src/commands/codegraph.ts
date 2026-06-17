import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Command } from "commander";
import { getCodeGraphStatus } from "../codegraph/cli.js";
import { codeGraphSetupSnippet } from "../codegraph/setup.js";
import { TinkerError } from "../core/errors.js";
import { loadCommandConfig } from "./common.js";

const execFileAsync = promisify(execFile);

export function registerCodeGraph(program: Command): void {
  const codegraph = program
    .command("codegraph")
    .description("Optional CodeGraph integration helpers");

  codegraph
    .command("status")
    .description("Report CodeGraph CLI availability and project status")
    .option("--json", "print JSON")
    .option("--project <path>", "project path")
    .option("--config <path>", "path to tinker.config.json")
    .action(async (options: { readonly project?: string; readonly config?: string }) => {
      const loaded = await loadCommandConfig(optionalConfigProject(options));
      const projectPath = options.project ?? loaded.config.analysis.codegraph.projectPath;
      const status = await getCodeGraphStatus({
        command: loaded.config.analysis.codegraph.command,
        projectPath,
        timeoutMs: loaded.config.analysis.codegraph.timeoutMs,
      });
      const report = { schemaVersion: "tinker.codegraph-status.v1", codegraph: status };
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      if (!status.available) {
        process.exitCode = 1;
      }
    });

  codegraph
    .command("setup")
    .requiredOption("--target <target>", "codex or opencode")
    .option("--print", "print setup snippet")
    .description("Print local MCP setup guidance")
    .action((options: { readonly target: string; readonly print?: boolean }) => {
      if (options.target !== "codex" && options.target !== "opencode") {
        throw new TinkerError(
          "CODEGRAPH_TARGET_INVALID",
          `Unsupported setup target: ${options.target}`,
        );
      }
      process.stdout.write(codeGraphSetupSnippet(options.target));
    });

  codegraph
    .command("init")
    .option("--project <path>", "project path")
    .option("--yes", "confirm local .codegraph initialization")
    .option("--config <path>", "path to tinker.config.json")
    .description("Explicitly initialize CodeGraph for a project")
    .action(
      async (options: {
        readonly project?: string;
        readonly yes?: boolean;
        readonly config?: string;
      }) => {
        if (options.yes !== true) {
          throw new TinkerError(
            "CODEGRAPH_INIT_REQUIRES_YES",
            "Pass --yes to create .codegraph state",
          );
        }
        const loaded = await loadCommandConfig(optionalConfigProject(options));
        const projectPath = options.project ?? loaded.config.analysis.codegraph.projectPath;
        await execFileAsync(loaded.config.analysis.codegraph.command, ["init", projectPath], {
          timeout: loaded.config.analysis.codegraph.timeoutMs,
        });
        process.stdout.write(`initialized CodeGraph for ${projectPath}\n`);
      },
    );
}

function optionalConfigProject(options: { readonly config?: string; readonly project?: string }): {
  readonly config?: string;
  readonly project?: string;
} {
  const result: { config?: string; project?: string } = {};
  if (options.config !== undefined) {
    result.config = options.config;
  }
  if (options.project !== undefined) {
    result.project = options.project;
  }
  return result;
}
