import { mkdir, readFile, writeFile, rm, access, readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { StorageAdapter } from "./types";

// keyは常に "{shareId}/page-N.{webp|jpg|png}" のような相対パス形式を想定し、
// UPLOAD_DIR配下からの脱出(パストラバーサル)ができないよう正規化して検証する。
function resolveSafePath(root: string, key: string): string {
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, key);
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(resolvedRoot + path.sep)) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return resolvedPath;
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private readonly root: string) {}

  async put(key: string, data: Buffer): Promise<void> {
    const filePath = resolveSafePath(this.root, key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
  }

  async get(key: string): Promise<Buffer | null> {
    const filePath = resolveSafePath(this.root, key);
    try {
      return await readFile(filePath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw err;
    }
  }

  async delete(key: string): Promise<void> {
    const filePath = resolveSafePath(this.root, key);
    await rm(filePath, { force: true });
  }

  async deletePrefix(prefix: string): Promise<void> {
    const dirPath = resolveSafePath(this.root, prefix);
    await rm(dirPath, { recursive: true, force: true });
  }

  async exists(key: string): Promise<boolean> {
    const filePath = resolveSafePath(this.root, key);
    try {
      await access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  // 主にテスト・デバッグ用途
  async listAll(): Promise<string[]> {
    const results: string[] = [];
    async function walk(dir: string) {
      const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) await walk(full);
        else results.push(full);
      }
    }
    await walk(this.root);
    return results;
  }
}

export async function ensureUploadDirExists(root: string): Promise<void> {
  await mkdir(root, { recursive: true });
  // ディレクトリが実在することを検証(将来のバグ検出用)
  const s = await stat(root);
  if (!s.isDirectory()) throw new Error(`UPLOAD_DIR is not a directory: ${root}`);
}
