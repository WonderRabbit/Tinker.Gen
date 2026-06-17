import assert from "node:assert/strict";
import { describe, it } from "vitest";
import { opencodeShim } from "../src/commands/integration.js";

describe("integration command", () => {
  it("prints an execFile-based OpenCode shim without shell concatenation", async () => {
    const output = opencodeShim();
    assert.match(output, /execFile/);
    assert.doesNotMatch(output, /shell\(/);
    assert.match(output, /"preview", "--manifest", manifest/);
  });
});
