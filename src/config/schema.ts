import { z } from "zod";

export type CodeGraphConfig = {
  readonly enabled: boolean;
  readonly command: string;
  readonly timeoutMs: number;
  readonly maxFiles: number;
  readonly projectPath: string;
  readonly autoInit: false;
  readonly preferMcp: false;
};

export type TinkerConfig = {
  readonly schemaVersion: "tinker.config.v1";
  readonly analysis: {
    readonly provider: "builtin" | "codegraph";
    readonly codegraph: CodeGraphConfig;
  };
  readonly output: {
    readonly directory: string;
  };
  readonly generation: {
    readonly defaultTemplate: "component-scaffold";
  };
};

const rawConfigSchema = z.object({
  schemaVersion: z.literal("tinker.config.v1").optional(),
  analysis: z
    .object({
      provider: z.enum(["builtin", "codegraph"]).optional(),
      codegraph: z
        .object({
          enabled: z.boolean().optional(),
          command: z
            .string()
            .min(1)
            .refine((value) => value === "codegraph", {
              message: "CodeGraph command must be the trusted 'codegraph' executable",
            })
            .optional(),
          timeoutMs: z.number().int().positive().optional(),
          maxFiles: z.number().int().positive().optional(),
          projectPath: z.string().min(1).optional(),
          autoInit: z.literal(false).optional(),
          preferMcp: z.literal(false).optional(),
        })
        .optional(),
    })
    .optional(),
  output: z
    .object({
      directory: z.string().min(1).optional(),
    })
    .optional(),
  generation: z
    .object({
      defaultTemplate: z.literal("component-scaffold").optional(),
    })
    .optional(),
});

export const tinkerConfigSchema = rawConfigSchema.transform<TinkerConfig>((value) => ({
  schemaVersion: value.schemaVersion ?? "tinker.config.v1",
  analysis: {
    provider: value.analysis?.provider ?? "builtin",
    codegraph: {
      enabled: value.analysis?.codegraph?.enabled ?? false,
      command: value.analysis?.codegraph?.command ?? "codegraph",
      timeoutMs: value.analysis?.codegraph?.timeoutMs ?? 10_000,
      maxFiles: value.analysis?.codegraph?.maxFiles ?? 20,
      projectPath: value.analysis?.codegraph?.projectPath ?? ".",
      autoInit: value.analysis?.codegraph?.autoInit ?? false,
      preferMcp: value.analysis?.codegraph?.preferMcp ?? false,
    },
  },
  output: {
    directory: value.output?.directory ?? ".tinker",
  },
  generation: {
    defaultTemplate: value.generation?.defaultTemplate ?? "component-scaffold",
  },
}));

export const defaultConfig: TinkerConfig = tinkerConfigSchema.parse({});

export type ConfigOverrides = {
  readonly codegraphEnabled?: boolean;
  readonly outputDirectory?: string;
  readonly projectPath?: string;
};
