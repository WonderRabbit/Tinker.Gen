import { z } from "zod";

export const createActionSchema = z.object({
  kind: z.literal("create"),
  templateId: z.literal("component-scaffold"),
  path: z.string().min(1),
  content: z.string(),
  sha256: z.string().length(64),
  sourceRefs: z.array(z.object({ path: z.string().min(1), kind: z.string().min(1) })),
});

export const previewSchema = z.object({
  schemaVersion: z.literal("tinker.preview.v1"),
  previewId: z.string().min(1),
  templateId: z.literal("component-scaffold"),
  manifestHash: z.string().length(64),
  actions: z.array(createActionSchema),
});

export const checkpointSchema = z.object({
  schemaVersion: z.literal("tinker.checkpoint.v1"),
  previewId: z.string().min(1),
  templateId: z.literal("component-scaffold"),
  manifestHash: z.string().length(64),
  actionHashes: z.array(z.object({ path: z.string().min(1), sha256: z.string().length(64) })),
});

export type Preview = z.infer<typeof previewSchema>;
export type Checkpoint = z.infer<typeof checkpointSchema>;
