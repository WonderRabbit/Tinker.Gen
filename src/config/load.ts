import { readFile } from "node:fs/promises";
import { errorMessage, TinkerError } from "../core/errors.js";
import { pathExists } from "../core/paths.js";
import {
  type ConfigOverrides,
  defaultConfig,
  type TinkerConfig,
  tinkerConfigSchema,
} from "./schema.js";

export type LoadedConfig = {
  readonly config: TinkerConfig;
  readonly source: "file" | "defaults";
  readonly path?: string;
};

type LoadConfigInput = {
  readonly configPath?: string;
  readonly overrides: ConfigOverrides;
};

export async function loadConfig(input: LoadConfigInput): Promise<LoadedConfig> {
  const configuredPath = input.configPath ?? "tinker.config.json";
  const exists = await pathExists(configuredPath);
  const base = exists ? await readConfigFile(configuredPath) : defaultConfig;
  const config = applyOverrides(base, input.overrides);
  const source = exists ? "file" : "defaults";
  if (exists) {
    return { config, source, path: configuredPath };
  }
  return { config, source };
}

async function readConfigFile(path: string): Promise<TinkerConfig> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new TinkerError("CONFIG_INVALID_JSON", `Invalid config ${path}: ${errorMessage(error)}`);
  }

  const result = tinkerConfigSchema.safeParse(parsed);
  if (!result.success) {
    throw new TinkerError("CONFIG_INVALID", `Invalid config ${path}: ${result.error.message}`);
  }
  return result.data;
}

function applyOverrides(config: TinkerConfig, overrides: ConfigOverrides): TinkerConfig {
  return {
    ...config,
    output: {
      ...config.output,
      directory: overrides.outputDirectory ?? config.output.directory,
    },
    analysis: {
      ...config.analysis,
      codegraph: {
        ...config.analysis.codegraph,
        enabled: overrides.codegraphEnabled ?? config.analysis.codegraph.enabled,
        projectPath: overrides.projectPath ?? config.analysis.codegraph.projectPath,
      },
    },
  };
}
