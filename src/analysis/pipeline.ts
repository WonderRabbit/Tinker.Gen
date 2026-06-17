import { join } from "node:path";
import { getCodeGraphStatus } from "../codegraph/cli.js";
import type { TinkerConfig } from "../config/schema.js";
import { writeJsonFile } from "../core/json.js";
import { analyzeBuiltin } from "./builtin-provider.js";
import type { Diagnostic, Inventory } from "./contracts.js";

export type CodegraphMode = "config" | "enabled" | "disabled";

type AnalyzeProjectInput = {
  readonly config: TinkerConfig;
  readonly projectPath: string;
  readonly outDir: string;
  readonly codegraphMode: CodegraphMode;
  readonly requireCodegraph: boolean;
};

export type AnalyzeProjectResult = {
  readonly inventory: Inventory;
  readonly diagnostics: readonly Diagnostic[];
};

export async function analyzeProject(input: AnalyzeProjectInput): Promise<AnalyzeProjectResult> {
  const codegraphEnabled =
    input.codegraphMode === "enabled" ||
    (input.codegraphMode === "config" && input.config.analysis.codegraph.enabled);
  const diagnostics: Diagnostic[] = [];

  if (codegraphEnabled) {
    const status = await getCodeGraphStatus({
      command: input.config.analysis.codegraph.command,
      projectPath: input.projectPath,
      timeoutMs: input.config.analysis.codegraph.timeoutMs,
    });
    if (!status.available || !status.initialized) {
      diagnostics.push({
        level: input.requireCodegraph ? "error" : "warning",
        code: status.available ? "CODEGRAPH_UNINITIALIZED" : "CODEGRAPH_UNAVAILABLE",
        message: input.requireCodegraph
          ? "CodeGraph is required but unavailable or uninitialized"
          : "CodeGraph unavailable or uninitialized; fallback to builtin analyzer",
      });
      if (input.requireCodegraph) {
        throw new Error(diagnostics[0]?.message ?? "CodeGraph required");
      }
    }
  }

  const inventory = await analyzeBuiltin(input.projectPath);
  const mergedInventory: Inventory = {
    ...inventory,
    diagnostics: [...inventory.diagnostics, ...diagnostics],
  };

  await writeJsonFile(join(input.outDir, "inventory.json"), mergedInventory);
  await writeJsonFile(join(input.outDir, "diagnostics.json"), {
    schemaVersion: "tinker.diagnostics.v1",
    diagnostics: mergedInventory.diagnostics,
  });
  await writeJsonFile(join(input.outDir, "analysis-manifest.json"), {
    schemaVersion: "tinker.analysis-manifest.v1",
    inventoryPath: "inventory.json",
    diagnosticsPath: "diagnostics.json",
    providerId: mergedInventory.providerId,
    generatedAt: new Date().toISOString(),
  });

  return { inventory: mergedInventory, diagnostics: mergedInventory.diagnostics };
}
