import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";

describe("prisma connectivity", () => {
  it("connects to Postgres and can query", async () => {
    const result = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 as ok`;
    expect(result[0]?.ok).toBe(1);
  });

  it("enforces the non-negative stock check constraint", async () => {
    await expect(
      prisma.$executeRaw`INSERT INTO "Product" (id, "slugEn", "slugFa", sku, "nameEn", "nameFa", price, "stockQuantity", "updatedAt")
        VALUES ('test-negative-stock', 'test-negative-stock-en', 'test-negative-stock-fa', 'TEST-NEG-SKU', 'Test', 'تست', 1000, -1, now())`
    ).rejects.toThrow();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
