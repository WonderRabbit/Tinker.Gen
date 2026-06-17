import { TinkerError } from "../core/errors.js";

export type CodeGraphSetupTarget = "codex" | "opencode";

export function codeGraphSetupSnippet(target: CodeGraphSetupTarget): string {
  if (target === "codex") {
    return [
      "[mcp_servers.codegraph]",
      'command = "codegraph"',
      'args = ["serve", "--mcp"]',
      "",
    ].join("\n");
  }
  if (target === "opencode") {
    return [
      "{",
      '  "mcp": {',
      '    "codegraph": {',
      '      "command": "codegraph",',
      '      "args": ["serve", "--mcp"]',
      "    }",
      "  }",
      "}",
      "",
    ].join("\n");
  }
  throw new TinkerError("CODEGRAPH_TARGET_INVALID", `Unsupported setup target: ${target}`);
}
