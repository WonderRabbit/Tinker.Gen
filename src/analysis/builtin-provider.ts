import { readdir, readFile, stat } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import ignore from "ignore";
import ts from "typescript";
import { z } from "zod";
import { TinkerError } from "../core/errors.js";
import { pathExists } from "../core/paths.js";
import type { Diagnostic, Inventory } from "./contracts.js";

type FileEntry = Inventory["files"][number];
type PackageManifest = Inventory["packageManifests"][number];
type ImportEdge = Inventory["importGraph"]["edges"][number];

const SKIPPED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".tinker",
  ".omo",
  ".codegraph",
]);

const packageJsonSchema = z
  .object({
    name: z.string().optional(),
    version: z.string().optional(),
    type: z.string().optional(),
  })
  .passthrough();

export async function analyzeBuiltin(projectPath: string): Promise<Inventory> {
  if (!(await pathExists(projectPath))) {
    throw new TinkerError("PROJECT_NOT_FOUND", `Project path not found: ${projectPath}`);
  }

  const gitignore = await loadGitignore(projectPath);
  const files = await collectFiles(projectPath, projectPath, gitignore);
  const packageManifests = await collectPackageManifests(projectPath, files);
  const importGraph = await collectImportGraph(projectPath, files);
  const diagnostics: Diagnostic[] = [];

  return {
    schemaVersion: "tinker.inventory.v1",
    providerId: "builtin",
    providerVersion: "0.1.0",
    artifactSchemaVersion: "tinker.analysis-artifacts.v1",
    command: "tinker analyze",
    cwd: process.cwd(),
    projectPath,
    timestamp: new Date().toISOString(),
    indexed: { fileCount: files.length },
    diagnostics,
    sourceRefs: files.map((file) => ({ path: file.path, kind: "file" })),
    files,
    languageCounts: languageCounts(files),
    packageManifests,
    importGraph,
  };
}

async function loadGitignore(projectPath: string): Promise<ReturnType<typeof ignore>> {
  const ig = ignore();
  const path = join(projectPath, ".gitignore");
  if (await pathExists(path)) {
    ig.add(await readFile(path, "utf8"));
  }
  return ig;
}

async function collectFiles(
  root: string,
  current: string,
  ig: ReturnType<typeof ignore>,
): Promise<FileEntry[]> {
  const entries = await readdir(current, { withFileTypes: true });
  const collected: FileEntry[] = [];
  for (const entry of entries) {
    const absolute = join(current, entry.name);
    const relativePath = relative(root, absolute);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name) && !ig.ignores(`${relativePath}/`)) {
        collected.push(...(await collectFiles(root, absolute, ig)));
      }
      continue;
    }
    if (entry.isFile() && !ig.ignores(relativePath)) {
      const info = await stat(absolute);
      collected.push({
        path: relativePath,
        language: languageForPath(entry.name),
        bytes: info.size,
      });
    }
  }
  return collected.sort((left, right) => left.path.localeCompare(right.path));
}

function languageForPath(path: string): string {
  const extension = extname(path);
  if (extension === ".ts" || extension === ".tsx") {
    return "TypeScript";
  }
  if (extension === ".js" || extension === ".jsx" || extension === ".mjs" || extension === ".cjs") {
    return "JavaScript";
  }
  if (basename(path) === "package.json") {
    return "JSON";
  }
  if (extension === ".json") {
    return "JSON";
  }
  return "Other";
}

function languageCounts(files: readonly FileEntry[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const file of files) {
    counts[file.language] = (counts[file.language] ?? 0) + 1;
  }
  return counts;
}

async function collectPackageManifests(
  root: string,
  files: readonly FileEntry[],
): Promise<PackageManifest[]> {
  const manifests: PackageManifest[] = [];
  for (const file of files) {
    if (basename(file.path) !== "package.json") {
      continue;
    }
    const parsed = packageJsonSchema.safeParse(
      JSON.parse(await readFile(join(root, file.path), "utf8")),
    );
    if (parsed.success) {
      manifests.push({
        path: file.path,
        name: parsed.data.name,
        version: parsed.data.version,
        type: parsed.data.type,
      });
    }
  }
  return manifests;
}

async function collectImportGraph(
  root: string,
  files: readonly FileEntry[],
): Promise<Inventory["importGraph"]> {
  const nodes = files.filter((file) => isScript(file.path)).map((file) => file.path);
  const edges: ImportEdge[] = [];
  for (const path of nodes) {
    const source = await readFile(join(root, path), "utf8");
    const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
    for (const statement of sourceFile.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        edges.push({ from: path, to: statement.moduleSpecifier.text });
      }
    }
  }
  return { nodes, edges };
}

function isScript(path: string): boolean {
  return [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(extname(path));
}
