import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalStorageProvider } from "@/lib/storage/local-storage-provider";

describe("LocalStorageProvider", () => {
  let baseDir: string;
  let provider: LocalStorageProvider;

  beforeEach(async () => {
    baseDir = await mkdtemp(path.join(tmpdir(), "mah-storage-"));
    provider = new LocalStorageProvider(baseDir);
  });

  afterEach(async () => {
    await rm(baseDir, { recursive: true, force: true });
  });

  it("writes and reads a file back", async () => {
    await provider.put("products/candle.jpg", Buffer.from("image-bytes"), "image/jpeg");
    const data = await provider.get("products/candle.jpg");
    expect(data?.toString()).toBe("image-bytes");
  });

  it("returns null for a missing key", async () => {
    const data = await provider.get("products/missing.jpg");
    expect(data).toBeNull();
  });

  it("deletes a file", async () => {
    await provider.put("products/candle.jpg", Buffer.from("image-bytes"), "image/jpeg");
    await provider.delete("products/candle.jpg");
    const data = await provider.get("products/candle.jpg");
    expect(data).toBeNull();
  });

  it("builds a public URL for a key", () => {
    expect(provider.urlFor("products/candle.jpg")).toBe("/uploads/products/candle.jpg");
  });

  it("rejects path traversal in keys", async () => {
    await expect(
      provider.put("../../etc/passwd", Buffer.from("nope"), "text/plain")
    ).rejects.toThrow();
  });
});
