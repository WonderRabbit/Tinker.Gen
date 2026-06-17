import { z } from "zod";
import { TinkerError } from "../core/errors.js";
import { readJsonFile, writeJsonFile } from "../core/json.js";

export const templateManifestSchema = z.object({
  schemaVersion: z.literal("tinker.template-manifest.v1"),
  template: z.object({
    id: z.literal("component-scaffold"),
    version: z.string().min(1),
  }),
  language: z.literal("typescript").default("typescript"),
  layers: z.array(z.string().min(1)).min(1).default(["component"]),
  component: z.object({
    name: z
      .string()
      .min(1)
      .regex(/^[a-z0-9-]+$/),
    exportName: z
      .string()
      .min(1)
      .regex(/^[A-Z][A-Za-z0-9]*$/),
    description: z.string().min(1),
  }),
  output: z.object({
    root: z.string().min(1).default(".tinker/generated"),
  }),
});

export type TemplateManifest = z.infer<typeof templateManifestSchema>;

export async function loadTemplateManifest(path: string): Promise<TemplateManifest> {
  const result = templateManifestSchema.safeParse(await readJsonFile(path));
  if (!result.success) {
    throw new TinkerError(
      "TEMPLATE_MANIFEST_INVALID",
      `Invalid template manifest: ${result.error.message}`,
    );
  }
  return result.data;
}

export async function saveTemplateManifest(
  path: string,
  manifest: TemplateManifest,
): Promise<void> {
  await writeJsonFile(path, manifest);
}
