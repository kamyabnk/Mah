import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { listProducts } from "@/lib/catalog/list-products";
import { searchProducts } from "@/lib/catalog/search-products";

const skuPrefix = "TEST-CATALOG-";
let categoryId: string;
let productIds: string[] = [];

beforeAll(async () => {
  const category = await prisma.category.create({
    data: { slugEn: "test-catalog-cat-en", slugFa: "test-catalog-cat-fa", nameEn: "Test Category", nameFa: "دسته تست" },
  });
  categoryId = category.id;

  const cheap = await prisma.product.create({
    data: {
      slugEn: "test-catalog-cheap-en",
      slugFa: "test-catalog-cheap-fa",
      sku: `${skuPrefix}CHEAP`,
      nameEn: "Cheap Amber Candle",
      nameFa: "شمع کهربا ارزان",
      status: "PUBLISHED",
      price: 150000,
      stockQuantity: 10,
      isBestSeller: true,
      averageRating: 3.5,
      publishedAt: new Date("2024-01-01"),
      categories: { create: { categoryId } },
    },
  });
  const expensive = await prisma.product.create({
    data: {
      slugEn: "test-catalog-expensive-en",
      slugFa: "test-catalog-expensive-fa",
      sku: `${skuPrefix}EXPENSIVE`,
      nameEn: "Luxury Vanilla Candle",
      nameFa: "شمع لوکس وانیل",
      status: "PUBLISHED",
      price: 900000,
      salePrice: 750000,
      stockQuantity: 2,
      averageRating: 4.8,
      publishedAt: new Date("2024-06-01"),
      categories: { create: { categoryId } },
    },
  });
  const outOfStock = await prisma.product.create({
    data: {
      slugEn: "test-catalog-oos-en",
      slugFa: "test-catalog-oos-fa",
      sku: `${skuPrefix}OOS`,
      nameEn: "Sold Out Sandalwood Candle",
      nameFa: "شمع صندل ناموجود",
      status: "PUBLISHED",
      price: 300000,
      stockQuantity: 0,
      publishedAt: new Date("2024-03-01"),
    },
  });
  const draft = await prisma.product.create({
    data: {
      slugEn: "test-catalog-draft-en",
      slugFa: "test-catalog-draft-fa",
      sku: `${skuPrefix}DRAFT`,
      nameEn: "Unpublished Candle",
      nameFa: "شمع منتشرنشده",
      status: "DRAFT",
      price: 200000,
      stockQuantity: 5,
    },
  });

  productIds = [cheap.id, expensive.id, outOfStock.id, draft.id];
});

afterAll(async () => {
  await prisma.productCategory.deleteMany({ where: { productId: { in: productIds } } });
  await prisma.product.deleteMany({ where: { id: { in: productIds } } });
  await prisma.category.deleteMany({ where: { id: categoryId } });
  await prisma.$disconnect();
});

describe("listProducts", () => {
  it("only returns published, non-deleted products", async () => {
    const result = await listProducts({ locale: "en", filters: {}, sort: "featured", page: 1 });
    const skus = result.products.map((p) => p.sku);
    expect(skus).not.toContain(`${skuPrefix}DRAFT`);
  });

  it("filters by category", async () => {
    const result = await listProducts({ locale: "en", filters: { categoryId }, sort: "featured", page: 1 });
    const skus = result.products.map((p) => p.sku);
    expect(skus).toContain(`${skuPrefix}CHEAP`);
    expect(skus).toContain(`${skuPrefix}EXPENSIVE`);
    expect(skus).not.toContain(`${skuPrefix}OOS`);
  });

  it("filters by price range", async () => {
    const result = await listProducts({
      locale: "en",
      filters: { categoryId, maxPrice: 200000 },
      sort: "featured",
      page: 1,
    });
    expect(result.products.map((p) => p.sku)).toEqual([`${skuPrefix}CHEAP`]);
  });

  it("filters in-stock only", async () => {
    const result = await listProducts({ locale: "en", filters: { inStock: true }, sort: "featured", page: 1 });
    expect(result.products.map((p) => p.sku)).not.toContain(`${skuPrefix}OOS`);
  });

  it("sorts by price ascending", async () => {
    const result = await listProducts({ locale: "en", filters: { categoryId }, sort: "price-asc", page: 1 });
    expect(result.products[0]?.sku).toBe(`${skuPrefix}CHEAP`);
  });

  it("sorts by rating descending", async () => {
    const result = await listProducts({ locale: "en", filters: { categoryId }, sort: "rating", page: 1 });
    expect(result.products[0]?.sku).toBe(`${skuPrefix}EXPENSIVE`);
  });

  it("resolves locale-appropriate name and slug", async () => {
    const result = await listProducts({ locale: "fa", filters: { categoryId }, sort: "featured", page: 1 });
    const item = result.products.find((p) => p.sku === `${skuPrefix}CHEAP`);
    expect(item?.name).toBe("شمع کهربا ارزان");
    expect(item?.slug).toBe("test-catalog-cheap-fa");
  });

  it("computes discount-aware salePrice on the expensive item", async () => {
    const result = await listProducts({ locale: "en", filters: { categoryId }, sort: "featured", page: 1 });
    const item = result.products.find((p) => p.sku === `${skuPrefix}EXPENSIVE`);
    expect(item?.salePrice).toBe(750000);
  });
});

describe("searchProducts", () => {
  it("finds a product by a partial name match", async () => {
    const result = await searchProducts("en", "Amber");
    expect(result.products.map((p) => p.sku)).toContain(`${skuPrefix}CHEAP`);
  });

  it("does not return unpublished products", async () => {
    const result = await searchProducts("en", "Unpublished");
    expect(result.products.map((p) => p.sku)).not.toContain(`${skuPrefix}DRAFT`);
  });

  it("does not crash on special characters", async () => {
    const result = await searchProducts("en", "candle & (test) | \"quote\"");
    expect(result).toBeDefined();
  });

  it("returns empty for an empty query", async () => {
    const result = await searchProducts("en", "   ");
    expect(result.products).toEqual([]);
  });
});
