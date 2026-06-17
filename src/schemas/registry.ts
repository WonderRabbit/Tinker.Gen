import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { z } from "zod";
import {
  analysisManifestSchema,
  diagnosticsFileSchema,
  inventorySchema,
} from "../analysis/contracts.js";
import { tinkerConfigSchema } from "../config/schema.js";
import { TinkerError } from "../core/errors.js";
import { readJsonFile } from "../core/json.js";
import { templateManifestSchema } from "../generation/manifest.js";
import { checkpointSchema, previewSchema } from "../preview/contracts.js";

export type SchemaKind =
  | "config"
  | "inventory"
  | "analysis-manifest"
  | "diagnostics"
  | "template-manifest"
  | "preview"
  | "checkpoint";

type SchemaEntry = {
  readonly kind: SchemaKind;
  readonly path: string;
  readonly schema: z.ZodType;
};

export const schemaRegistry: readonly SchemaEntry[] = [
  { kind: "config", path: "schemas/tinker.config.schema.json", schema: tinkerConfigSchema },
  { kind: "inventory", path: "schemas/inventory.schema.json", schema: inventorySchema },
  {
    kind: "analysis-manifest",
    path: "schemas/analysis-manifest.schema.json",
    schema: analysisManifestSchema,
  },
  { kind: "diagnostics", path: "schemas/diagnostics.schema.json", schema: diagnosticsFileSchema },
  {
    kind: "template-manifest",
    path: "schemas/template-manifest.schema.json",
    schema: templateManifestSchema,
  },
  { kind: "preview", path: "schemas/preview.schema.json", schema: previewSchema },
  { kind: "checkpoint", path: "schemas/checkpoint.schema.json", schema: checkpointSchema },
];

export async function schemaListText(): Promise<string> {
  return schemaRegistry.map((entry) => `${entry.kind}\t${entry.path}`).join("\n");
}

export async function validateByKind(kind: string, file: string): Promise<void> {
  const entry = schemaRegistry.find((candidate) => candidate.kind === kind);
  if (entry === undefined) {
    throw new TinkerError("SCHEMA_KIND_UNKNOWN", `Unknown schema kind: ${kind}`);
  }
  const result = entry.schema.safeParse(await readJsonFile(file));
  if (!result.success) {
    throw new TinkerError(
      "SCHEMA_VALIDATION_FAILED",
      `Schema validation failed: ${result.error.message}`,
    );
  }
}

export async function schemaFilesAvailable(): Promise<boolean> {
  for (const entry of schemaRegistry) {
    await readFile(join(process.cwd(), entry.path), "utf8");
  }
  return true;
}
