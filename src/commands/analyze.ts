import type { Command } from "commander";
import { analyzeProject, type CodegraphMode } from "../analysis/pipeline.js";
import { loadCommandConfig } from "./common.js";

export function registerAnalyze(program: Command): void {
  program
    .command("analyze")
    .description("Analyze a project and write normalized Tinker.Gen artifacts")
    .option("--config <path>", "path to tinker.config.json")
    .option("--project <path>", "project path")
    .option("--out <path>", "artifact output directory")
    .option("--codegraph", "enable optional CodeGraph assistance")
    .option("--no-codegraph", "force built-in analyzer")
    .option("--require-codegraph", "fail instead of falling back when CodeGraph is unavailable")
    .action(
      async (options: {
        readonly config?: string;
        readonly project?: string;
        readonly out?: string;
        readonly codegraph?: boolean;
        readonly requireCodegraph?: boolean;
      }) => {
        const commandOptions: {
          config?: string;
          out?: string;
          project?: string;
          codegraph?: boolean;
        } = {};
        if (options.config !== undefined) {
          commandOptions.config = options.config;
        }
        if (options.out !== undefined) {
          commandOptions.out = options.out;
        }
        if (options.codegraph !== undefined) {
          commandOptions.codegraph = options.codegraph;
        }
        const loaded = await loadCommandConfig(commandOptions);
        const mode: CodegraphMode =
          options.codegraph === true
            ? "enabled"
            : options.codegraph === false
              ? "disabled"
              : "config";
        const projectPath = options.project ?? loaded.config.analysis.codegraph.projectPath;
        const result = await analyzeProject({
          config: loaded.config,
          projectPath,
          outDir: loaded.config.output.directory,
          codegraphMode: mode,
          requireCodegraph: options.requireCodegraph ?? false,
        });
        process.stdout.write(
          `analysis complete provider=${result.inventory.providerId} files=${result.inventory.indexed.fileCount}\n`,
        );
        for (const diagnostic of result.diagnostics) {
          process.stdout.write(`${diagnostic.level} ${diagnostic.code}: ${diagnostic.message}\n`);
        }
      },
    );
}
