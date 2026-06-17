import { mkdir, stat } from "node:fs/promises";
import { isAbsolute, join, normalize, sep } from "node:path";
import { TinkerError } from "../core/errors.js";
import { writeJsonFile } from "../core/json.js";
import { manifestHash, renderComponentScaffold } from "../generation/generator.js";
import type { TemplateManifest } from "../generation/manifest.js";
import type { Checkpoint, Preview } from "./contracts.js";

type CreatePreviewInput = {
  readonly manifest: TemplateManifest;
  readonly outDir: string;
};

export async function createPreview(input: CreatePreviewInput): Promise<{
  readonly preview: Preview;
  readonly checkpoint: Checkpoint;
}> {
  if (!isSafeRelativePath(input.manifest.output.root)) {
    throw new TinkerError(
      "TEMPLATE_OUTPUT_ROOT_UNSAFE",
      `Output root must be a safe relative path: ${input.manifest.output.root}`,
    );
  }
  const outputRoot =
    input.manifest.output.root === ".tinker/generated"
      ? join(input.outDir, "generated")
      : join(input.outDir, input.manifest.output.root);
  const actions = renderComponentScaffold(input.manifest, outputRoot);
  for (const action of actions) {
    if (await exists(action.path)) {
      throw new TinkerError(
        "PREVIEW_TARGET_EXISTS",
        `Create-only target already exists: ${action.path}`,
      );
    }
  }

  const hash = manifestHash(input.manifest);
  const previewId = `preview-${hash.slice(0, 12)}`;
  const preview: Preview = {
    schemaVersion: "tinker.preview.v1",
    previewId,
    templateId: input.manifest.template.id,
    manifestHash: hash,
    actions: [...actions],
  };
  const checkpoint: Checkpoint = {
    schemaVersion: "tinker.checkpoint.v1",
    previewId,
    templateId: input.manifest.template.id,
    manifestHash: hash,
    actionHashes: actions.map((action) => ({ path: action.path, sha256: action.sha256 })),
  };

  await mkdir(join(input.outDir, "previews"), { recursive: true });
  await mkdir(join(input.outDir, "checkpoints"), { recursive: true });
  await writeJsonFile(join(input.outDir, "previews", `${previewId}.json`), preview);
  await writeJsonFile(join(input.outDir, "checkpoints", `${previewId}.json`), checkpoint);
  return { preview, checkpoint };
}

function isSafeRelativePath(path: string): boolean {
  if (isAbsolute(path)) {
    return false;
  }
  const normalized = normalize(path);
  return !normalized.split(sep).includes("..");
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
