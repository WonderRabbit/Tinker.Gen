import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type CodeGraphStatus = {
  readonly available: boolean;
  readonly initialized: boolean;
  readonly version?: string;
  readonly error?: string;
};

type CodeGraphStatusInput = {
  readonly command: string;
  readonly projectPath: string;
  readonly timeoutMs: number;
  readonly env?: NodeJS.ProcessEnv;
};

export async function getCodeGraphStatus(input: CodeGraphStatusInput): Promise<CodeGraphStatus> {
  const env = input.env ?? process.env;
  const version = await runCodeGraph(input.command, ["--version"], input.timeoutMs, env);
  if (!version.ok) {
    return { available: false, initialized: false, error: version.message };
  }

  const status = await runCodeGraph(
    input.command,
    ["status", "--json", input.projectPath],
    input.timeoutMs,
    env,
  );
  if (!status.ok) {
    return {
      available: true,
      initialized: false,
      version: version.stdout.trim(),
      error: status.message,
    };
  }

  const parsedStatus = parseStatus(status.stdout);
  const report: CodeGraphStatus = {
    available: true,
    initialized: parsedStatus.initialized,
    version: version.stdout.trim(),
  };
  if (parsedStatus.error !== undefined) {
    return { ...report, error: parsedStatus.error };
  }
  return report;
}

async function runCodeGraph(
  command: string,
  args: readonly string[],
  timeoutMs: number,
  env: NodeJS.ProcessEnv,
): Promise<
  { readonly ok: true; readonly stdout: string } | { readonly ok: false; readonly message: string }
> {
  try {
    const result = await execFileAsync(command, [...args], { timeout: timeoutMs, env });
    return { ok: true, stdout: result.stdout };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, message };
  }
}

function parseStatus(stdout: string): { readonly initialized: boolean; readonly error?: string } {
  try {
    const parsed: unknown = JSON.parse(stdout);
    return hasInitialized(parsed)
      ? { initialized: parsed.initialized }
      : {
          initialized: false,
          error: "CODEGRAPH_STATUS_SHAPE_INVALID: status JSON must include initialized:boolean",
        };
  } catch {
    return {
      initialized: false,
      error: "CODEGRAPH_STATUS_JSON_INVALID: status output was not valid JSON",
    };
  }
}

function hasInitialized(value: unknown): value is { readonly initialized: boolean } {
  return (
    typeof value === "object" &&
    value !== null &&
    "initialized" in value &&
    typeof value.initialized === "boolean"
  );
}
