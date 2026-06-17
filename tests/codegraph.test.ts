import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { describe, it } from "vitest";
import { getCodeGraphStatus } from "../src/codegraph/cli.js";

describe("CodeGraph wrapper", () => {
  it("reports unavailable CLI from a PATH shadow", async () => {
    const status = await getCodeGraphStatus({
      command: "codegraph",
      projectPath: ".",
      timeoutMs: 200,
      env: { PATH: "/usr/bin:/bin" },
    });

    assert.equal(status.available, false);
  });

  it("parses fake status JSON", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tinker-codegraph-"));
    const bin = join(dir, "codegraph");
    await writeFile(
      bin,
      '#!/bin/sh\nif [ "$1" = "--version" ]; then echo \'codegraph 1.2.3\'; else echo \'{"initialized":true}\'; fi\n',
      { encoding: "utf8", mode: 0o755 },
    );
    try {
      const status = await getCodeGraphStatus({
        command: "codegraph",
        projectPath: ".",
        timeoutMs: 500,
        env: { PATH: `${dir}${delimiter}${process.env.PATH ?? ""}` },
      });
      assert.equal(status.available, true);
      assert.equal(status.initialized, true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("reports malformed status JSON as a structured uninitialized error", async () => {
    const dir = await mkdtemp(join(tmpdir(), "tinker-codegraph-malformed-"));
    const bin = join(dir, "codegraph");
    await writeFile(
      bin,
      "#!/bin/sh\nif [ \"$1\" = \"--version\" ]; then echo 'codegraph 1.2.3'; else echo 'not-json'; fi\n",
      { encoding: "utf8", mode: 0o755 },
    );
    try {
      const status = await getCodeGraphStatus({
        command: "codegraph",
        projectPath: ".",
        timeoutMs: 500,
        env: { PATH: `${dir}${delimiter}${process.env.PATH ?? ""}` },
      });
      assert.equal(status.available, true);
      assert.equal(status.initialized, false);
      assert.match(status.error ?? "", /CODEGRAPH_STATUS_JSON_INVALID/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
