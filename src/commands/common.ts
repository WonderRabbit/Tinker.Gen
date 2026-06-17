import type { Command } from "commander";
import { loadConfig } from "../config/load.js";

export function addConfigOption(command: Command): Command {
  return command.option("--config <path>", "path to tinker.config.json");
}

export async function loadCommandConfig(options: {
  readonly config?: string;
  readonly out?: string;
  readonly project?: string;
  readonly codegraph?: boolean;
}): ReturnType<typeof loadConfig> {
  const overrides: {
    codegraphEnabled?: boolean;
    outputDirectory?: string;
    projectPath?: string;
  } = {};
  if (options.codegraph !== undefined) {
    overrides.codegraphEnabled = options.codegraph;
  }
  if (options.out !== undefined) {
    overrides.outputDirectory = options.out;
  }
  if (options.project !== undefined) {
    overrides.projectPath = options.project;
  }
  if (options.config !== undefined) {
    return loadConfig({
      configPath: options.config,
      overrides,
    });
  }
  return loadConfig({ overrides });
}
