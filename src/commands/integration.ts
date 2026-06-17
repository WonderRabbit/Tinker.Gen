import type { Command } from "commander";

export function registerIntegration(program: Command): void {
  const integration = program.command("integration").description("Optional integration templates");
  const opencode = integration
    .command("opencode")
    .description("OpenCode/Tiny-Chu optional shim helpers");

  opencode
    .command("print")
    .description("Print an opt-in OpenCode plugin template that shells out to tinker")
    .action(() => {
      process.stdout.write(opencodeShim());
    });
}

export function opencodeShim(): string {
  return [
    "export const tinkerGen = {",
    '  name: "tinker-gen",',
    '  async analyze({ execFile }) { return execFile("tinker", ["analyze", "--no-codegraph"]); },',
    '  async status({ execFile }) { return execFile("tinker", ["doctor", "--json"]); },',
    '  async preview({ execFile, manifest }) { return execFile("tinker", ["preview", "--manifest", manifest]); },',
    '  async apply({ execFile, preview }) { return execFile("tinker", ["apply", "--preview", preview]); }',
    "};",
    "",
  ].join("\n");
}
