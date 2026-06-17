import { mkdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

export async function mkdirp(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

export async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export function toProjectRelative(root: string, path: string): string {
  return resolve(root, path).slice(resolve(root).length + 1);
}
