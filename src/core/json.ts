import { readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { errorMessage, TinkerError } from "./errors.js";
import { mkdirp } from "./paths.js";

export async function readJsonFile(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new TinkerError(
      "JSON_READ_FAILED",
      `Could not read JSON from ${path}: ${errorMessage(error)}`,
    );
  }
}

export async function writeJsonFile(path: string, value: unknown): Promise<void> {
  await mkdirp(dirname(path));
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
