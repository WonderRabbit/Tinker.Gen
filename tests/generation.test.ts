import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import { applyPreview } from "../src/apply/apply.js";
import { writeJsonFile } from "../src/core/json.js";
import { manifestHash } from "../src/generation/generator.js";
import { loadTemplateManifest } from "../src/generation/manifest.js";
import { createPreview } from "../src/preview/preview.js";

describe("preview and apply", () => {
  it("creates a checkpointed preview and applies create-only files", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "tinker-generation-"));
    try {
      const manifest = await loadTemplateManifest("examples/component-scaffold.json");
      const preview = await createPreview({ manifest, outDir });
      assert.equal(preview.preview.actions.length, 2);
      await writeJsonFile(join(outDir, "template-manifest.json"), manifest);

      await applyPreview({ previewId: preview.preview.previewId, outDir });
      const generated = await readFile(
        join(outDir, "generated", "sample-widget", "index.ts"),
        "utf8",
      );
      assert.match(generated, /SampleWidget/);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("requires an explicit preview id", async () => {
    await assert.rejects(applyPreview({ previewId: "", outDir: ".tinker-test" }), /preview/i);
  });

  it("accepts safe custom output roots and rejects traversal roots", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "tinker-custom-root-"));
    const manifestFile = join(outDir, "manifest.json");
    await writeFile(
      manifestFile,
      JSON.stringify({
        schemaVersion: "tinker.template-manifest.v1",
        template: { id: "component-scaffold", version: "1.0.0" },
        component: {
          name: "sample-widget",
          exportName: "SampleWidget",
          description: "Custom output root",
        },
        output: { root: "custom-generated" },
      }),
      "utf8",
    );
    try {
      const manifest = await loadTemplateManifest(manifestFile);
      const preview = await createPreview({ manifest, outDir });
      assert.equal(
        preview.preview.actions[0]?.path.startsWith(join(outDir, "custom-generated")),
        true,
      );

      await assert.rejects(
        createPreview({
          manifest: { ...manifest, output: { root: "../escape" } },
          outDir,
        }),
        /output root/i,
      );
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("escapes generated TypeScript string content as data", async () => {
    const manifest = await loadTemplateManifest("examples/component-scaffold.json");
    const preview = await createPreview({
      manifest: {
        ...manifest,
        component: {
          ...manifest.component,
          description: '"; throw new Error("owned"); //',
        },
      },
      outDir: ".tinker-test",
    });

    assert.equal(
      preview.preview.actions[0]?.content.includes(
        'return "\\"; throw new Error(\\"owned\\"); //";',
      ),
      true,
    );
  });

  it("rejects stale previews when the current manifest changes", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "tinker-stale-preview-"));
    try {
      const manifest = await loadTemplateManifest("examples/component-scaffold.json");
      const preview = await createPreview({ manifest, outDir });
      await writeFile(
        join(outDir, "template-manifest.json"),
        JSON.stringify({
          ...manifest,
          component: { ...manifest.component, description: "Changed after preview" },
        }),
        "utf8",
      );

      await assert.rejects(
        applyPreview({ previewId: preview.preview.previewId, outDir }),
        /manifest does not match preview/i,
      );
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("rejects previews when the current manifest is missing", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "tinker-missing-manifest-"));
    try {
      const manifest = await loadTemplateManifest("examples/component-scaffold.json");
      const preview = await createPreview({ manifest, outDir });

      assert.equal(preview.preview.manifestHash, manifestHash(manifest));
      await assert.rejects(
        applyPreview({ previewId: preview.preview.previewId, outDir }),
        /template-manifest/i,
      );
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("preflights all create-only targets before writing any file", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "tinker-preflight-"));
    try {
      const manifest = await loadTemplateManifest("examples/component-scaffold.json");
      const preview = await createPreview({ manifest, outDir });
      await writeJsonFile(join(outDir, "template-manifest.json"), manifest);
      const firstPath = preview.preview.actions[0]?.path ?? "";
      const secondPath = preview.preview.actions[1]?.path ?? "";
      await mkdir(join(outDir, "generated", "sample-widget"), { recursive: true });
      await writeFile(secondPath, "existing", "utf8");

      await assert.rejects(
        applyPreview({ previewId: preview.preview.previewId, outDir }),
        /already exists/i,
      );
      await assert.rejects(readFile(firstPath, "utf8"));
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("fails while apply lock exists and writes no generated files", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "tinker-lock-conflict-"));
    try {
      const manifest = await loadTemplateManifest("examples/component-scaffold.json");
      const preview = await createPreview({ manifest, outDir });
      await writeJsonFile(join(outDir, "template-manifest.json"), manifest);
      await writeFile(join(outDir, "apply.lock"), "locked", "utf8");

      await assert.rejects(
        applyPreview({ previewId: preview.preview.previewId, outDir }),
        /already running/i,
      );
      await assert.rejects(
        readFile(join(outDir, "generated", "sample-widget", "index.ts"), "utf8"),
      );
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("rejects late-created create-only targets without overwriting content", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "tinker-target-race-"));
    try {
      const manifest = await loadTemplateManifest("examples/component-scaffold.json");
      const preview = await createPreview({ manifest, outDir });
      await writeJsonFile(join(outDir, "template-manifest.json"), manifest);
      const firstAction = preview.preview.actions[0];
      assert.notEqual(firstAction, undefined);
      const firstPath = firstAction?.path ?? "";
      const racedContent = "late-created content outside preview";
      const originalDigest = createHash("sha256").update(racedContent).digest("hex");
      await mkdir(join(outDir, "generated", "sample-widget"), { recursive: true });
      await writeFile(firstPath, racedContent, "utf8");
      const currentDigest = createHash("sha256")
        .update(await readFile(firstPath, "utf8"))
        .digest("hex");

      await assert.rejects(
        applyPreview({ previewId: preview.preview.previewId, outDir }),
        /already exists/i,
      );
      const afterRejectDigest = createHash("sha256")
        .update(await readFile(firstPath, "utf8"))
        .digest("hex");
      assert.equal(currentDigest, originalDigest);
      assert.equal(afterRejectDigest, originalDigest);
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("rejects diagnostics symlinks before writing outside the output directory", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "tinker-diagnostics-link-"));
    const outsideDir = await mkdtemp(join(tmpdir(), "tinker-diagnostics-outside-"));
    const outsideFile = join(outsideDir, "diagnostics.json");
    try {
      const manifest = await loadTemplateManifest("examples/component-scaffold.json");
      const preview = await createPreview({ manifest, outDir });
      await writeJsonFile(join(outDir, "template-manifest.json"), manifest);
      await writeFile(outsideFile, "outside", "utf8");
      await symlink(outsideFile, join(outDir, "diagnostics.json"));

      await assert.rejects(
        applyPreview({ previewId: preview.preview.previewId, outDir }),
        /unsafe/i,
      );
      assert.equal(await readFile(outsideFile, "utf8"), "outside");
    } finally {
      await rm(outDir, { recursive: true, force: true });
      await rm(outsideDir, { recursive: true, force: true });
    }
  });

  it("publishes create-only files without leaving temp siblings", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "tinker-temp-clean-"));
    try {
      const manifest = await loadTemplateManifest("examples/component-scaffold.json");
      const preview = await createPreview({ manifest, outDir });
      await writeJsonFile(join(outDir, "template-manifest.json"), manifest);

      await applyPreview({ previewId: preview.preview.previewId, outDir });
      const files = await readdir(join(outDir, "generated", "sample-widget"));
      assert.equal(
        files.some((file) => file.endsWith(".tmp")),
        false,
      );
    } finally {
      await rm(outDir, { recursive: true, force: true });
    }
  });

  it("rejects previews that target a symlink parent", async () => {
    const outDir = await mkdtemp(join(process.cwd(), ".tinker-test-symlink-"));
    const outsideDir = await mkdtemp(join(tmpdir(), "tinker-symlink-outside-"));
    const linkPath = join(outDir, "linked-root");
    await symlink(outsideDir, linkPath);
    try {
      const manifest = await loadTemplateManifest("examples/component-scaffold.json");
      const symlinkManifest = { ...manifest, output: { root: "linked-root" } };
      const preview = await createPreview({ manifest: symlinkManifest, outDir });

      await writeJsonFile(join(outDir, "template-manifest.json"), symlinkManifest);
      await assert.rejects(
        applyPreview({ previewId: preview.preview.previewId, outDir }),
        /unsafe/i,
      );
    } finally {
      await rm(outDir, { recursive: true, force: true });
      await rm(outsideDir, { recursive: true, force: true });
    }
  });
});
