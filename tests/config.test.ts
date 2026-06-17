import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import { loadConfig } from "../src/config/load.js";

describe("config loader", () => {
  it("uses defaults when an explicit config path is missing", async () => {
    const config = await loadConfig({ configPath: "missing-config.json", overrides: {} });

    assert.equal(config.config.analysis.codegraph.enabled, false);
    assert.equal(config.source, "defaults");
  });

  it("rejects malformed config JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tinker-config-"));
    const file = join(dir, "tinker.config.json");
    await writeFile(file, "{ invalid json", "utf8");
    try {
      await assert.rejects(loadConfig({ configPath: file, overrides: {} }), /config/i);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("keeps configured project paths when no CLI project override is present", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tinker-config-project-"));
    const file = join(dir, "tinker.config.json");
    await writeFile(
      file,
      JSON.stringify({
        schemaVersion: "tinker.config.v1",
        analysis: { codegraph: { projectPath: "tests/fixtures/basic-ts" } },
      }),
      "utf8",
    );
    try {
      const loaded = await loadConfig({ configPath: file, overrides: {} });
      assert.equal(loaded.config.analysis.codegraph.projectPath, "tests/fixtures/basic-ts");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("rejects repository-selected CodeGraph executables", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tinker-config-command-"));
    const file = join(dir, "tinker.config.json");
    await writeFile(
      file,
      JSON.stringify({
        schemaVersion: "tinker.config.v1",
        analysis: { codegraph: { command: "./payload" } },
      }),
      "utf8",
    );
    try {
      await assert.rejects(loadConfig({ configPath: file, overrides: {} }), /codegraph/i);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
