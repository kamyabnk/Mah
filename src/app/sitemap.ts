import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const SITE_URL = process.env.SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      select: { slugEn: true, slugFa: true, updatedAt: true },
    }),
    prisma.category.findMany({
      where: { isActive: true, deletedAt: null },
      select: { slugEn: true, slugFa: true, updatedAt: true },
    }),
  ]);

  const staticEntries: MetadataRoute.Sitemap = ["", "/candles", "/search"].flatMap((path) => [
    { url: `${SITE_URL}/en${path}`, lastModified: new Date() },
    { url: `${SITE_URL}/fa${path}`, lastModified: new Date() },
  ]);

  const productEntries: MetadataRoute.Sitemap = products.flatMap((p) => [
    { url: `${SITE_URL}/en/product/${p.slugEn}`, lastModified: p.updatedAt },
    { url: `${SITE_URL}/fa/product/${p.slugFa}`, lastModified: p.updatedAt },
  ]);

  const categoryEntries: MetadataRoute.Sitemap = categories.flatMap((c) => [
    { url: `${SITE_URL}/en/candles/${c.slugEn}`, lastModified: c.updatedAt },
    { url: `${SITE_URL}/fa/candles/${c.slugFa}`, lastModified: c.updatedAt },
  ]);

  return [...staticEntries, ...productEntries, ...categoryEntries];
}
