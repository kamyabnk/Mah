import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageProvider } from "./storage-provider";

export class LocalStorageProvider implements StorageProvider {
  private readonly resolvedBaseDir: string;

  constructor(
    baseDir: string,
    private readonly publicPath: string = "/uploads"
  ) {
    this.resolvedBaseDir = path.resolve(baseDir);
  }

  private resolveKey(key: string): string {
    // Construct the full path from the key
    const fullPath = path.resolve(this.resolvedBaseDir, key);
    // Ensure the resolved path is still within baseDir (prevents path traversal)
    const relativePath = path.relative(this.resolvedBaseDir, fullPath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    // Remove leading slashes and dots from the relative path for storage
    const normalized = relativePath.replace(/^([./\\])+/, "");
    return normalized;
  }

  async put(key: string, data: Buffer, _contentType: string): Promise<string> {
    const safeKey = this.resolveKey(key);
    const filePath = path.join(this.resolvedBaseDir, safeKey);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    return this.urlFor(safeKey);
  }

  async get(key: string): Promise<Buffer | null> {
    const safeKey = this.resolveKey(key);
    try {
      return await readFile(path.join(this.resolvedBaseDir, safeKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const safeKey = this.resolveKey(key);
    await rm(path.join(this.resolvedBaseDir, safeKey), { force: true });
  }

  urlFor(key: string): string {
    const safeKey = this.resolveKey(key);
    // Normalize path separators to forward slashes for URLs
    const urlKey = safeKey.replace(/\\/g, "/");
    return `${this.publicPath}/${urlKey}`;
  }
}
