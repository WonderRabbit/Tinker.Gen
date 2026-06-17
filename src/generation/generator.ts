import { createHash } from "node:crypto";
import { join } from "node:path";
import type { TemplateManifest } from "./manifest.js";

export type CreateAction = {
  readonly kind: "create";
  readonly templateId: "component-scaffold";
  readonly path: string;
  readonly content: string;
  readonly sha256: string;
  readonly sourceRefs: { readonly path: string; readonly kind: string }[];
};

export function renderComponentScaffold(
  manifest: TemplateManifest,
  outputRoot: string = manifest.output.root,
): readonly CreateAction[] {
  const root = join(outputRoot, manifest.component.name);
  const index = [
    `export function ${manifest.component.exportName}(): string {`,
    `  return ${JSON.stringify(manifest.component.description)};`,
    "}",
    "",
  ].join("\n");
  const readme = [
    `# ${manifest.component.exportName}`,
    "",
    manifest.component.description,
    "",
  ].join("\n");
  return [
    createAction(join(root, "index.ts"), index, manifest),
    createAction(join(root, "README.md"), readme, manifest),
  ];
}

export function createAction(
  path: string,
  content: string,
  manifest: TemplateManifest,
): CreateAction {
  return {
    kind: "create",
    templateId: manifest.template.id,
    path,
    content,
    sha256: createHash("sha256").update(content).digest("hex"),
    sourceRefs: [
      { path: "template:component-scaffold", kind: "template" },
      { path: `layers:${manifest.layers.join(",")}`, kind: "manifest" },
    ],
  };
}

export function manifestHash(manifest: TemplateManifest): string {
  return createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
}
