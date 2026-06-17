import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import { inventorySchema } from "../src/analysis/contracts.js";
import { analyzeProject } from "../src/analysis/pipeline.js";
import { defaultConfig } from "../src/config/schema.js";

describe("analysis pipeline", () => {
  it("writes built-in inventory without CodeGraph by default", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "tinker-analysis-"));
    try {
      const result = await analyzeProject({
        config: defaultConfig,
        projectPath: "tests/fixtures/basic-ts",
        outDir,
        codegraphMode: "disabled",
        requireCodegraph: false,
      });

      assert.equal(result.inventory.providerId, "builtin");
      assert.equal(result.inventory.languageCounts.TypeScript, 2);
      assert.equal(result.inventory.packageManifests.length, 1);
      assert.deepEqual(result.inventory.importGraph.edges, [
        { from: "src/index.ts", to: "./message.js" },
      ]);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("fails for missing projects", async () => {
    await assert.rejects(
      analyzeProject({
        config: defaultConfig,
        projectPath: "tests/fixtures/missing-project",
        outDir: ".tinker-test",
        codegraphMode: "disabled",
        requireCodegraph: false,
      }),
      /project/i,
    );
  });

  it("keeps inventory schema-valid when package.json fields have invalid types", async () => {
    const projectDir = await mkdtemp(join(tmpdir(), "tinker-invalid-package-"));
    const outDir = await mkdtemp(join(tmpdir(), "tinker-invalid-package-out-"));
    await writeFile(
      join(projectDir, "package.json"),
      JSON.stringify({ name: 42, version: false, type: ["module"] }),
      "utf8",
    );
    try {
      const result = await analyzeProject({
        config: defaultConfig,
        projectPath: projectDir,
        outDir,
        codegraphMode: "disabled",
        requireCodegraph: false,
      });

      assert.deepEqual(result.inventory.packageManifests, []);
      assert.equal(inventorySchema.safeParse(result.inventory).success, true);
    } finally {
      await rm(projectDir, { recursive: true, force: true });
      await rm(outDir, { recursive: true, force: true });
    }
  });
});
