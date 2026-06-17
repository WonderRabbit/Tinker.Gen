import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { link, lstat, mkdir, open, realpath, rename, rm } from "node:fs/promises";
import { basename, dirname, join, normalize, relative, resolve, sep } from "node:path";
import { TinkerError } from "../core/errors.js";
import { readJsonFile } from "../core/json.js";
import { manifestHash } from "../generation/generator.js";
import { templateManifestSchema } from "../generation/manifest.js";
import { checkpointSchema, previewSchema } from "../preview/contracts.js";

type ApplyPreviewInput = {
  readonly previewId: string;
  readonly outDir: string;
};

export async function applyPreview(input: ApplyPreviewInput): Promise<readonly string[]> {
  if (!isPreviewId(input.previewId)) {
    throw new TinkerError("PREVIEW_REQUIRED", "A preview id is required");
  }
  const lock = await acquireLock(join(input.outDir, "apply.lock"));
  try {
    const preview = previewSchema.parse(
      await readJsonFile(join(input.outDir, "previews", `${input.previewId}.json`)),
    );
    const checkpoint = checkpointSchema.parse(
      await readJsonFile(join(input.outDir, "checkpoints", `${input.previewId}.json`)),
    );
    if (
      preview.previewId !== checkpoint.previewId ||
      preview.templateId !== checkpoint.templateId ||
      preview.manifestHash !== checkpoint.manifestHash
    ) {
      throw new TinkerError("PREVIEW_STALE", "Preview checkpoint does not match preview");
    }
    await assertCurrentManifest(input.outDir, preview.manifestHash);
    const diagnosticsPath = join(input.outDir, "diagnostics.json");
    for (const action of preview.actions) {
      const expected = checkpoint.actionHashes.find((entry) => entry.path === action.path);
      if (expected?.sha256 !== action.sha256 || hash(action.content) !== action.sha256) {
        throw new TinkerError("PREVIEW_STALE", `Preview content hash mismatch for ${action.path}`);
      }
      await assertSafeCreateTarget(input.outDir, action.path);
      if (await exists(action.path)) {
        throw new TinkerError(
          "APPLY_TARGET_EXISTS",
          `Create-only target already exists: ${action.path}`,
        );
      }
    }
    await assertSafeWritableFile(input.outDir, diagnosticsPath);
    const written: string[] = [];
    for (const action of preview.actions) {
      await writeCreateOnlyFile(input.outDir, action.path, action.content);
      written.push(action.path);
    }
    await writeSafeJsonFile(input.outDir, diagnosticsPath, {
      schemaVersion: "tinker.diagnostics.v1",
      diagnostics: [
        {
          level: "info",
          code: "APPLY_COMPLETE",
          message: `Applied ${written.length} create-only files from ${input.previewId}`,
        },
      ],
    });
    return written;
  } finally {
    await lock.close();
    await rm(join(input.outDir, "apply.lock"), { force: true });
  }
}

async function assertCurrentManifest(outDir: string, expectedHash: string): Promise<void> {
  const current = templateManifestSchema.parse(
    await readJsonFile(join(outDir, "template-manifest.json")),
  );
  if (manifestHash(current) !== expectedHash) {
    throw new TinkerError("PREVIEW_STALE", "Current template manifest does not match preview");
  }
}

function isPreviewId(value: string): boolean {
  return /^preview-[a-f0-9]{12}$/.test(value);
}

async function assertSafeCreateTarget(outDir: string, path: string): Promise<void> {
  await assertSafePathWithinOutDir(outDir, path);
  if (await hasSymlinkParent(resolve(path), resolve(outDir))) {
    throw new TinkerError("APPLY_TARGET_UNSAFE", `Target path is unsafe: ${path}`);
  }
  await assertParentRealpathInside(resolve(outDir), resolve(path));
}

async function assertSafeWritableFile(outDir: string, path: string): Promise<void> {
  await assertSafePathWithinOutDir(outDir, path);
  if (await hasSymlinkParent(resolve(path), resolve(outDir))) {
    throw new TinkerError("APPLY_TARGET_UNSAFE", `Target path is unsafe: ${path}`);
  }
  await assertParentRealpathInside(resolve(outDir), resolve(path));
  const info = await safeLstat(path);
  if (info?.isSymbolicLink() === true) {
    throw new TinkerError("APPLY_TARGET_UNSAFE", `Target path is unsafe: ${path}`);
  }
}

async function assertSafePathWithinOutDir(outDir: string, path: string): Promise<void> {
  const normalized = normalize(path);
  if (normalized.split(sep).includes("..")) {
    throw new TinkerError("APPLY_TARGET_UNSAFE", `Target path is unsafe: ${path}`);
  }
  const anchor = resolve(outDir);
  const target = resolve(normalized);
  if (target !== anchor && !target.startsWith(`${anchor}${sep}`)) {
    throw new TinkerError("APPLY_TARGET_UNSAFE", `Target path is unsafe: ${path}`);
  }
}

async function hasSymlinkParent(path: string, anchor: string): Promise<boolean> {
  const relativeParent = relative(anchor, dirname(path));
  if (relativeParent.length === 0) {
    return false;
  }
  if (relativeParent.startsWith("..")) {
    return false;
  }
  const parts = relativeParent.split(sep).filter(Boolean);
  let current = anchor;
  for (const part of parts) {
    current = join(current, part);
    try {
      const info = await lstat(current);
      if (info.isSymbolicLink()) {
        return true;
      }
    } catch (error) {
      if (isNodeErrorCode(error, "ENOENT")) {
        return false;
      }
      throw error;
    }
  }
  return false;
}

async function assertParentRealpathInside(anchor: string, target: string): Promise<void> {
  try {
    const [realAnchor, realParent] = await Promise.all([
      realpath(anchor),
      realpath(dirname(target)),
    ]);
    if (realParent !== realAnchor && !realParent.startsWith(`${realAnchor}${sep}`)) {
      throw new TinkerError("APPLY_TARGET_UNSAFE", `Target path is unsafe: ${target}`);
    }
  } catch (error) {
    if (error instanceof TinkerError) {
      throw error;
    }
    if (!isNodeErrorCode(error, "ENOENT")) {
      throw error;
    }
  }
}

async function acquireLock(path: string): Promise<Awaited<ReturnType<typeof open>>> {
  await mkdir(dirname(path), { recursive: true });
  try {
    return await open(path, "wx");
  } catch (error) {
    if (!isNodeErrorCode(error, "EEXIST")) {
      throw error;
    }
    throw new TinkerError("APPLY_LOCKED", "Another apply operation is already running");
  }
}

async function exists(path: string): Promise<boolean> {
  return (await safeLstat(path)) !== undefined;
}

async function safeLstat(path: string): Promise<Awaited<ReturnType<typeof lstat>> | undefined> {
  try {
    return await lstat(path);
  } catch (error) {
    if (isNodeErrorCode(error, "ENOENT")) {
      return undefined;
    }
    throw error;
  }
}

async function safeRm(path: string): Promise<void> {
  try {
    await rm(path, { force: true });
  } catch (error) {
    if (!isNodeErrorCode(error, "ENOENT")) {
      throw error;
    }
    return undefined;
  }
}

function hash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

async function writeCreateOnlyFile(outDir: string, path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await assertSafeCreateTarget(outDir, path);
  if (await exists(path)) {
    throw new TinkerError("APPLY_TARGET_EXISTS", `Create-only target already exists: ${path}`);
  }
  const tempPath = tempSibling(path);
  try {
    await writeTempFile(outDir, tempPath, content);
    await assertSafeCreateTarget(outDir, path);
    await link(tempPath, path);
  } catch (error) {
    if (isNodeErrorCode(error, "EEXIST")) {
      throw new TinkerError("APPLY_TARGET_EXISTS", `Create-only target already exists: ${path}`);
    }
    throw error;
  } finally {
    await safeRm(tempPath);
  }
}

async function writeSafeJsonFile(outDir: string, path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await assertSafeWritableFile(outDir, path);
  const tempPath = tempSibling(path);
  try {
    await writeTempFile(outDir, tempPath, `${JSON.stringify(value, null, 2)}\n`);
    await assertSafeWritableFile(outDir, path);
    await rename(tempPath, path);
  } finally {
    await safeRm(tempPath);
  }
}

async function writeTempFile(outDir: string, path: string, content: string): Promise<void> {
  await assertSafeCreateTarget(outDir, path);
  const handle = await open(
    path,
    constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY | constants.O_NOFOLLOW,
    0o600,
  );
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

function tempSibling(path: string): string {
  return join(dirname(path), `.${basename(path)}.${process.pid}.${randomUUID()}.tmp`);
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}
