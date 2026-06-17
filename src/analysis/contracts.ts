import { z } from "zod";

export const diagnosticSchema = z.object({
  level: z.enum(["info", "warning", "error"]),
  code: z.string().min(1),
  message: z.string().min(1),
});

export const inventorySchema = z.object({
  schemaVersion: z.literal("tinker.inventory.v1"),
  providerId: z.string().min(1),
  providerVersion: z.string().min(1),
  artifactSchemaVersion: z.literal("tinker.analysis-artifacts.v1"),
  command: z.string().min(1),
  cwd: z.string().min(1),
  projectPath: z.string().min(1),
  timestamp: z.string().min(1),
  indexed: z.object({
    fileCount: z.number().int().nonnegative(),
  }),
  diagnostics: z.array(diagnosticSchema),
  sourceRefs: z.array(z.object({ path: z.string().min(1), kind: z.string().min(1) })),
  files: z.array(
    z.object({
      path: z.string().min(1),
      language: z.string().min(1),
      bytes: z.number().int().nonnegative(),
    }),
  ),
  languageCounts: z.record(z.string(), z.number().int().nonnegative()),
  packageManifests: z.array(
    z.object({
      path: z.string().min(1),
      name: z.string().optional(),
      version: z.string().optional(),
      type: z.string().optional(),
    }),
  ),
  importGraph: z.object({
    nodes: z.array(z.string().min(1)),
    edges: z.array(z.object({ from: z.string().min(1), to: z.string().min(1) })),
  }),
});

export const analysisManifestSchema = z.object({
  schemaVersion: z.literal("tinker.analysis-manifest.v1"),
  inventoryPath: z.string().min(1),
  diagnosticsPath: z.string().min(1),
  providerId: z.string().min(1),
  generatedAt: z.string().min(1),
});

export const diagnosticsFileSchema = z.object({
  schemaVersion: z.literal("tinker.diagnostics.v1"),
  diagnostics: z.array(diagnosticSchema),
});

export type Diagnostic = z.infer<typeof diagnosticSchema>;
export type Inventory = z.infer<typeof inventorySchema>;
