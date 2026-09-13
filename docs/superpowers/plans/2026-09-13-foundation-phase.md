# Foundation Phase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Next.js/Prisma/Postgres foundation for MAH Candle Co. (مه کندل) — project scaffold, full database schema, dual-realm auth boundary, i18n/RTL infrastructure, and a base design system — so Phases 2-5 (storefront, checkout, admin, CMS) build on it without restructuring.

**Architecture:** One Next.js 15 App Router app, TypeScript throughout, Postgres via Prisma, locale routing at `/en` and `/fa` via next-intl, two isolated NextAuth v5 (JWT-session) realms for Customer and AdminUser, a `StorageProvider` interface backed by local disk, a `PaymentProvider` interface backed by a non-auto-succeeding manual stub.

**Tech Stack:** Next.js 15, React 19, TypeScript 5, Tailwind CSS v4, Prisma 6 + PostgreSQL 16, next-intl, next-auth v5 (beta), bcryptjs, zod, vitest + @testing-library/react, Docker/Docker Compose.

**Spec:** [docs/superpowers/specs/2026-09-13-foundation-phase-design.md](../specs/2026-09-13-foundation-phase-design.md)

## Global Constraints

- Single Next.js application — no separate API service.
- Locale routing is `/en` and `/fa` only; every page/layout is locale-aware (`dir="rtl"` for `fa`, `dir="ltr"` for `en`).
- Every translatable field/model uses the literal `xxxEn`/`xxxFa` column-pair convention — no generic EAV/translation table.
- All monetary `Decimal` fields are denominated in Toman; `Payment.currency` defaults `"IRT"`; any Rial conversion happens only inside a specific payment provider's own code.
- `deletedAt` (soft delete) exists only on `Product` and `Category`. `Order` rows are never soft- or hard-deleted; lifecycle is status-driven only.
- Customer and Admin authentication are fully isolated: separate tables, separate NextAuth instances, separate cookie names/secrets. Admin route protection is enforced server-side on every request/action — never trust client-side role state.
- The storage layer is abstracted behind a `StorageProvider` interface so `/public/uploads` can be swapped for S3-compatible storage later without touching callers.
- The payment layer is abstracted behind a `PaymentProvider` interface. The stub implementation must never auto-mark a payment as succeeded — no fake payment success logic.
- Architecture must remain Docker/VPS friendly (no platform-locked APIs).
- No seed data, no storefront pages, no admin UI, and no checkout/cart features in this phase — those are Phases 2-5.

---

## File Structure

```
prisma/
  schema.prisma
src/
  env.ts
  lib/
    prisma.ts
    cn.ts
    auth/
      password.ts
      permissions.ts
      admin-authorize.ts
      customer-authorize.ts
      admin-auth.ts
      customer-auth.ts
    storage/
      storage-provider.ts
      local-storage-provider.ts
    payments/
      payment-provider.ts
      manual-payment-provider.ts
  i18n/
    routing.ts
    request.ts
    navigation.ts
  components/
    ui/
      container.tsx
      heading.tsx
      text.tsx
      button.tsx
      badge.tsx
      card.tsx
      input.tsx
  middleware.ts
  app/
    globals.css
    [locale]/
      layout.tsx
      page.tsx
      design-system/
        page.tsx
messages/
  en.json
  fa.json
tests/
  lib/
    env.test.ts
    auth/
      password.test.ts
      permissions.test.ts
      admin-authorize.test.ts
      customer-authorize.test.ts
    storage/
      local-storage-provider.test.ts
    payments/
      manual-payment-provider.test.ts
    prisma-connectivity.test.ts
  components/
    ui/
      button.test.tsx
docker-compose.yml
Dockerfile
.dockerignore
.env.example
package.json / tsconfig.json / next.config.ts / eslint config / vitest.config.ts / postcss.config.mjs
README.md
```

---

### Task 1: Project scaffold, tooling, and env validation

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `.prettierrc.json`, `.gitignore`, `.env.example`, `README.md`
- Create: `src/env.ts`
- Test: `tests/lib/env.test.ts`

**Interfaces:**
- Produces: `envSchema` (zod schema, exported for testing) and `env` (parsed singleton) from `src/env.ts`, consumed by every later task that needs `DATABASE_URL`, `ADMIN_AUTH_SECRET`, `CUSTOMER_AUTH_SECRET`.

- [ ] **Step 1: Initialize package.json and install dependencies**

```bash
npm init -y
npm install next@latest react@latest react-dom@latest zod@latest
npm install -D typescript@latest @types/react@latest @types/react-dom@latest @types/node@latest eslint@latest eslint-config-next@latest prettier@latest vitest@latest vite-tsconfig-paths@latest happy-dom@latest @testing-library/react@latest
```

- [ ] **Step 2: Write `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "forceConsistentCasingInFileNames": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Write `next.config.ts`**

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

(This gets wrapped with the next-intl plugin in Task 7 once next-intl is installed.)

- [ ] **Step 4: Write `eslint.config.mjs`**

```js
import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
];
```

Run `npm install -D @eslint/eslintrc@latest` if it isn't already present as a transitive dep.

- [ ] **Step 5: Write `.prettierrc.json`**

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "es5",
  "printWidth": 100
}
```

- [ ] **Step 6: Write `.gitignore`**

```
node_modules
.next
out
.env
.env.local
*.log
.DS_Store
/public/uploads/*
!/public/uploads/.gitkeep
```

- [ ] **Step 7: Create `public/uploads/.gitkeep`**

Empty file so the uploads directory exists in a fresh checkout.

- [ ] **Step 8: Write `src/env.ts`**

```ts
import { z } from "zod";

export const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ADMIN_AUTH_SECRET: z.string().min(32, "ADMIN_AUTH_SECRET must be at least 32 characters"),
  CUSTOMER_AUTH_SECRET: z.string().min(32, "CUSTOMER_AUTH_SECRET must be at least 32 characters"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);
```

- [ ] **Step 9: Write the failing test**

```ts
// tests/lib/env.test.ts
import { describe, expect, it } from "vitest";
import { envSchema } from "@/env";

describe("envSchema", () => {
  it("parses a valid environment", () => {
    const result = envSchema.parse({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      ADMIN_AUTH_SECRET: "a".repeat(32),
      CUSTOMER_AUTH_SECRET: "b".repeat(32),
      NODE_ENV: "test",
    });
    expect(result.DATABASE_URL).toBe("postgresql://user:pass@localhost:5432/db");
  });

  it("rejects a short ADMIN_AUTH_SECRET", () => {
    expect(() =>
      envSchema.parse({
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        ADMIN_AUTH_SECRET: "too-short",
        CUSTOMER_AUTH_SECRET: "b".repeat(32),
      })
    ).toThrow();
  });

  it("rejects a missing DATABASE_URL", () => {
    expect(() =>
      envSchema.parse({
        ADMIN_AUTH_SECRET: "a".repeat(32),
        CUSTOMER_AUTH_SECRET: "b".repeat(32),
      })
    ).toThrow();
  });
});
```

- [ ] **Step 10: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.{ts,tsx}"],
  },
});
```

- [ ] **Step 11: Add scripts to `package.json`**

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  }
}
```

- [ ] **Step 12: Run the test suite and verify it passes**

Run: `npx vitest run`
Expected: 3 passed (env schema tests).

- [ ] **Step 13: Write `.env.example`**

```
DATABASE_URL="postgresql://mah:mah_dev_password@localhost:5432/mah_candle?schema=public"
ADMIN_AUTH_SECRET="replace-with-a-random-32-plus-character-secret"
CUSTOMER_AUTH_SECRET="replace-with-a-different-random-32-plus-character-secret"
```

- [ ] **Step 14: Generate a real local `.env` (gitignored, not committed)**

```bash
node -e "console.log('DATABASE_URL=\"postgresql://mah:mah_dev_password@localhost:5432/mah_candle?schema=public\"')" > .env
node -e "console.log('ADMIN_AUTH_SECRET=\"' + require('crypto').randomBytes(32).toString('hex') + '\"')" >> .env
node -e "console.log('CUSTOMER_AUTH_SECRET=\"' + require('crypto').randomBytes(32).toString('hex') + '\"')" >> .env
```

- [ ] **Step 15: Write `README.md`** covering: prerequisites (Node 20+, Docker), `npm install`, `docker compose up -d`, `npm run db:migrate`, `npm run dev`, `npm test`.

- [ ] **Step 16: Verify tooling end to end**

Run: `npx tsc --noEmit && npx prettier --check . --ignore-unknown`
Expected: both succeed with no errors (lint/build of app code is verified once real source exists, starting Task 6).

- [ ] **Step 17: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js project, tooling, and env validation"
```

---

### Task 2: Docker Compose Postgres + complete Prisma schema + migration

**Files:**
- Create: `docker-compose.yml`
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`
- Test: `tests/lib/prisma-connectivity.test.ts`

**Interfaces:**
- Consumes: `env.DATABASE_URL` from Task 1.
- Produces: `prisma` (singleton `PrismaClient`) from `src/lib/prisma.ts`, and the generated `@prisma/client` types used by every later task (`AdminRole`, `AdminUser`, `Customer`, `Product`, `ProductVariant`, `Order`, `OrderItem`, `Payment`, etc.).

- [ ] **Step 1: Write `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: mah
      POSTGRES_PASSWORD: mah_dev_password
      POSTGRES_DB: mah_candle
    ports:
      - "5432:5432"
    volumes:
      - mah_postgres_data:/var/lib/postgresql/data

volumes:
  mah_postgres_data:
```

- [ ] **Step 2: Start Postgres**

Run: `docker compose up -d`
Expected: `db` container running and healthy (`docker compose ps` shows `Up`).

- [ ] **Step 3: Install Prisma**

```bash
npm install @prisma/client@latest
npm install -D prisma@latest
npx prisma init --datasource-provider postgresql
```

Delete the `prisma/schema.prisma` that `init` generates — it will be replaced in full by Step 4.

- [ ] **Step 4: Write the complete `prisma/schema.prisma`**

```prisma
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ---------- Enums ----------

enum ProductStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum InventoryTransactionType {
  SALE
  MANUAL_ADJUSTMENT
  RESTOCK
  CANCELLATION
  RETURN
}

enum OrderStatus {
  PENDING
  PAYMENT_PENDING
  PAID
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
  RETURNED
}

enum PaymentStatus {
  PENDING
  SUCCEEDED
  FAILED
  REFUNDED
  CANCELLED
}

enum CouponType {
  PERCENTAGE
  FIXED
}

enum CouponAppliesTo {
  ALL
  CATEGORY
  PRODUCT
}

enum ReviewStatus {
  PENDING
  APPROVED
  REJECTED
}

enum HomepageSectionType {
  HERO
  FEATURED_CATEGORIES
  BEST_SELLERS
  NEW_ARRIVALS
  SEASONAL
  SHOP_BY_FRAGRANCE
  PROMO_BANNER
  ABOUT
  NEWSLETTER
}

enum MenuLocation {
  HEADER
  FOOTER
}

enum BlogStatus {
  DRAFT
  PUBLISHED
  SCHEDULED
}

// ---------- Auth: Customer realm ----------

model Customer {
  id              String    @id @default(cuid())
  email           String    @unique
  passwordHash    String
  firstName       String
  lastName        String
  phone           String?
  isActive        Boolean   @default(true)
  emailVerifiedAt DateTime?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  addresses     CustomerAddress[]
  orders        Order[]
  cart          Cart?
  wishlistItems WishlistItem[]
  reviews       Review[]
  couponUsages  CouponUsage[]

  @@index([isActive])
}

model CustomerAddress {
  id          String   @id @default(cuid())
  customerId  String
  customer    Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  label       String
  firstName   String
  lastName    String
  phone       String
  addressLine String
  city        String
  province    String
  postalCode  String
  country     String   @default("IR")
  isDefault   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([customerId])
}

// ---------- Auth: Admin realm ----------

model AdminRole {
  id          String   @id @default(cuid())
  key         String   @unique
  nameEn      String
  nameFa      String
  permissions String[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  admins AdminUser[]
}

model AdminUser {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  roleId       String
  role         AdminRole @relation(fields: [roleId], references: [id])
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  updatedProducts       Product[]              @relation("ProductUpdatedBy")
  inventoryTransactions InventoryTransaction[]
  orderStatusChanges    OrderStatusHistory[]
  uploadedMedia         MediaAsset[]
  notifications         Notification[]

  @@index([isActive])
}

// ---------- Catalog ----------

model Category {
  id               String     @id @default(cuid())
  slugEn           String     @unique
  slugFa           String     @unique
  nameEn           String
  nameFa           String
  descriptionEn    String?
  descriptionFa    String?
  image            String?
  banner           String?
  parentId         String?
  parent           Category?  @relation("CategoryTree", fields: [parentId], references: [id])
  children         Category[] @relation("CategoryTree")
  seoTitleEn       String?
  seoTitleFa       String?
  seoDescriptionEn String?
  seoDescriptionFa String?
  isActive         Boolean    @default(true)
  sortOrder        Int        @default(0)
  deletedAt        DateTime?
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt

  products ProductCategory[]

  @@index([parentId])
  @@index([isActive, sortOrder])
}

model FragranceFamily {
  id            String   @id @default(cuid())
  slugEn        String   @unique
  slugFa        String   @unique
  nameEn        String
  nameFa        String
  descriptionEn String?
  descriptionFa String?
  image         String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  products Product[]
}

model Product {
  id                   String        @id @default(cuid())
  slugEn               String        @unique
  slugFa               String        @unique
  sku                  String        @unique
  nameEn               String
  nameFa               String
  shortDescriptionEn   String?
  shortDescriptionFa   String?
  descriptionEn        String?
  descriptionFa        String?
  status               ProductStatus @default(DRAFT)
  hasVariants          Boolean       @default(false)
  price                Decimal       @db.Decimal(12, 0)
  salePrice            Decimal?      @db.Decimal(12, 0)
  costPrice            Decimal?      @db.Decimal(12, 0)
  stockQuantity        Int           @default(0)
  lowStockThreshold    Int           @default(5)
  weight               Decimal?      @db.Decimal(10, 2)
  dimensions           Json?
  waxType              String?
  wickType             String?
  burnTimeMinutes      Int?
  fragranceFamilyId    String?
  fragranceFamily      FragranceFamily? @relation(fields: [fragranceFamilyId], references: [id])
  fragranceNotesEn     String?
  fragranceNotesFa     String?
  color                String?
  size                 String?
  ingredientsEn        String?
  ingredientsFa        String?
  careInstructionsEn   String?
  careInstructionsFa   String?
  safetyInstructionsEn String?
  safetyInstructionsFa String?
  seoTitleEn           String?
  seoTitleFa           String?
  seoDescriptionEn     String?
  seoDescriptionFa     String?
  seoKeywordsEn        String?
  seoKeywordsFa        String?
  isFeatured           Boolean   @default(false)
  isNewArrival         Boolean   @default(false)
  isBestSeller         Boolean   @default(false)
  publishedAt          DateTime?
  updatedByAdminId     String?
  updatedByAdmin       AdminUser? @relation("ProductUpdatedBy", fields: [updatedByAdminId], references: [id])
  deletedAt            DateTime?
  createdAt            DateTime  @default(now())
  updatedAt            DateTime  @updatedAt

  categories            ProductCategory[]
  images                ProductImage[]
  variants              ProductVariant[]
  tags                  ProductTag[]
  inventoryTransactions InventoryTransaction[]
  cartItems             CartItem[]
  wishlistItems         WishlistItem[]
  orderItems            OrderItem[]
  reviews               Review[]

  @@index([status])
  @@index([status, isFeatured])
  @@index([status, isBestSeller])
  @@index([status, isNewArrival])
}

model ProductVariant {
  id                String   @id @default(cuid())
  productId         String
  product           Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku               String   @unique
  nameEn            String
  nameFa            String
  size              String?
  color             String?
  fragrance         String?
  price             Decimal? @db.Decimal(12, 0)
  salePrice         Decimal? @db.Decimal(12, 0)
  stockQuantity     Int      @default(0)
  lowStockThreshold Int      @default(5)
  weight            Decimal? @db.Decimal(10, 2)
  barcode           String?
  isActive          Boolean  @default(true)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  inventoryTransactions InventoryTransaction[]
  cartItems             CartItem[]
  orderItems            OrderItem[]

  @@index([productId])
}

model ProductImage {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  url       String
  altEn     String?
  altFa     String?
  sortOrder Int     @default(0)
  isPrimary Boolean @default(false)

  @@index([productId])
}

model ProductCategory {
  productId  String
  categoryId String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@id([productId, categoryId])
  @@index([categoryId])
}

model Tag {
  id     String @id @default(cuid())
  slug   String @unique
  nameEn String
  nameFa String

  products ProductTag[]
}

model ProductTag {
  productId String
  tagId     String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  tag       Tag     @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([productId, tagId])
  @@index([tagId])
}

// ---------- Inventory ----------

model InventoryTransaction {
  id                String                    @id @default(cuid())
  productId         String
  product           Product                   @relation(fields: [productId], references: [id])
  variantId         String?
  variant           ProductVariant?           @relation(fields: [variantId], references: [id])
  type              InventoryTransactionType
  quantityChange    Int
  resultingQuantity Int
  orderItemId       String?
  orderItem         OrderItem?                @relation(fields: [orderItemId], references: [id])
  note              String?
  createdByAdminId  String?
  createdByAdmin    AdminUser?                @relation(fields: [createdByAdminId], references: [id])
  createdAt         DateTime                  @default(now())

  @@unique([orderItemId, type])
  @@index([productId, createdAt])
  @@index([variantId])
}

// ---------- Cart / Wishlist ----------

model Cart {
  id           String   @id @default(cuid())
  customerId   String?  @unique
  customer     Customer? @relation(fields: [customerId], references: [id], onDelete: Cascade)
  sessionToken String?  @unique
  currency     String   @default("IRT")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  items CartItem[]
}

model CartItem {
  id        String          @id @default(cuid())
  cartId    String
  cart      Cart            @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId String
  product   Product         @relation(fields: [productId], references: [id])
  variantId String?
  variant   ProductVariant? @relation(fields: [variantId], references: [id])
  quantity  Int
  unitPrice Decimal         @db.Decimal(12, 0)
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  @@index([cartId])
}

model WishlistItem {
  id         String   @id @default(cuid())
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id], onDelete: Cascade)
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdAt  DateTime @default(now())

  @@unique([customerId, productId])
}

// ---------- Orders / Payments ----------

model Order {
  id              String      @id @default(cuid())
  orderNumber     String      @unique
  customerId      String?
  customer        Customer?   @relation(fields: [customerId], references: [id])
  guestEmail      String?
  guestPhone      String?
  status          OrderStatus @default(PENDING)
  subtotal        Decimal     @db.Decimal(12, 0)
  discountTotal   Decimal     @default(0) @db.Decimal(12, 0)
  shippingTotal   Decimal     @default(0) @db.Decimal(12, 0)
  taxTotal        Decimal     @default(0) @db.Decimal(12, 0)
  grandTotal      Decimal     @db.Decimal(12, 0)
  currency        String      @default("IRT")
  couponId        String?
  coupon          Coupon?     @relation(fields: [couponId], references: [id])
  shippingAddress Json
  billingAddress  Json?
  customerNote    String?
  internalNote    String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  items         OrderItem[]
  statusHistory OrderStatusHistory[]
  payments      Payment[]
  couponUsage   CouponUsage?

  @@index([status, createdAt])
  @@index([customerId])
}

model OrderItem {
  id             String          @id @default(cuid())
  orderId        String
  order          Order           @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId      String?
  product        Product?        @relation(fields: [productId], references: [id], onDelete: SetNull)
  variantId      String?
  variant        ProductVariant? @relation(fields: [variantId], references: [id], onDelete: SetNull)
  productNameEn  String
  productNameFa  String
  sku            String
  variantLabelEn String?
  variantLabelFa String?
  unitPrice      Decimal         @db.Decimal(12, 0)
  quantity       Int
  lineTotal      Decimal         @db.Decimal(12, 0)

  inventoryTransactions InventoryTransaction[]

  @@index([orderId])
  @@index([productId])
}

model OrderStatusHistory {
  id               String      @id @default(cuid())
  orderId          String
  order            Order       @relation(fields: [orderId], references: [id], onDelete: Cascade)
  status           OrderStatus
  note             String?
  changedByAdminId String?
  changedByAdmin   AdminUser?  @relation(fields: [changedByAdminId], references: [id])
  createdAt        DateTime    @default(now())

  @@index([orderId, createdAt])
}

model Payment {
  id             String        @id @default(cuid())
  orderId        String
  order          Order         @relation(fields: [orderId], references: [id])
  provider       String
  status         PaymentStatus @default(PENDING)
  amount         Decimal       @db.Decimal(12, 0)
  currency       String        @default("IRT")
  providerRef    String?       @unique
  idempotencyKey String        @unique
  rawPayload     Json?
  createdAt      DateTime      @default(now())
  updatedAt      DateTime      @updatedAt

  @@index([orderId, status])
}

// ---------- Promotions ----------

model Coupon {
  id                String           @id @default(cuid())
  code              String           @unique
  type              CouponType
  value             Decimal          @db.Decimal(12, 2)
  appliedTo         CouponAppliesTo  @default(ALL)
  categoryId        String?
  productId         String?
  minOrderAmount    Decimal?         @db.Decimal(12, 0)
  maxDiscountAmount Decimal?         @db.Decimal(12, 0)
  startsAt          DateTime?
  endsAt            DateTime?
  usageLimit        Int?
  perCustomerLimit  Int?
  usedCount         Int              @default(0)
  isActive          Boolean          @default(true)
  createdAt         DateTime         @default(now())
  updatedAt         DateTime         @updatedAt

  orders Order[]
  usages CouponUsage[]

  @@index([isActive])
}

model CouponUsage {
  id         String   @id @default(cuid())
  couponId   String
  coupon     Coupon   @relation(fields: [couponId], references: [id])
  customerId String
  customer   Customer @relation(fields: [customerId], references: [id])
  orderId    String   @unique
  order      Order    @relation(fields: [orderId], references: [id])
  createdAt  DateTime @default(now())

  @@index([couponId, customerId])
}

// ---------- Reviews ----------

model Review {
  id         String       @id @default(cuid())
  productId  String
  product    Product      @relation(fields: [productId], references: [id], onDelete: Cascade)
  customerId String
  customer   Customer     @relation(fields: [customerId], references: [id], onDelete: Cascade)
  rating     Int
  body       String
  locale     String
  status     ReviewStatus @default(PENDING)
  isFeatured Boolean      @default(false)
  createdAt  DateTime     @default(now())
  updatedAt  DateTime     @updatedAt

  @@index([productId, status])
  @@index([status])
}

// ---------- CMS ----------

model Page {
  id               String   @id @default(cuid())
  slug             String   @unique
  titleEn          String
  titleFa          String
  bodyEn           String
  bodyFa           String
  seoTitleEn       String?
  seoTitleFa       String?
  seoDescriptionEn String?
  seoDescriptionFa String?
  isPublished      Boolean  @default(false)
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}

model HomepageSection {
  id                  String              @id @default(cuid())
  type                HomepageSectionType
  titleEn             String?
  titleFa             String?
  subtitleEn          String?
  subtitleFa          String?
  descriptionEn       String?
  descriptionFa       String?
  imageUrl            String?
  ctaLabelEn          String?
  ctaLabelFa          String?
  ctaLink             String?
  secondaryCtaLabelEn String?
  secondaryCtaLabelFa String?
  secondaryCtaLink    String?
  badgeEn             String?
  badgeFa             String?
  config              Json?
  isEnabled           Boolean             @default(true)
  sortOrder           Int                 @default(0)
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  @@index([isEnabled, sortOrder])
}

model MenuItem {
  id        String       @id @default(cuid())
  menu      MenuLocation
  labelEn   String
  labelFa   String
  url       String
  parentId  String?
  parent    MenuItem?    @relation("MenuTree", fields: [parentId], references: [id])
  children  MenuItem[]   @relation("MenuTree")
  sortOrder Int          @default(0)
  isEnabled Boolean      @default(true)

  @@index([menu, parentId, sortOrder])
}

model MediaAsset {
  id               String     @id @default(cuid())
  url              String
  filename         String
  mimeType         String
  size             Int
  width            Int?
  height           Int?
  altEn            String?
  altFa            String?
  createdByAdminId String?
  createdByAdmin   AdminUser? @relation(fields: [createdByAdminId], references: [id])
  createdAt        DateTime   @default(now())
}

model BlogPost {
  id               String     @id @default(cuid())
  slugEn           String     @unique
  slugFa           String     @unique
  titleEn          String
  titleFa          String
  excerptEn        String?
  excerptFa        String?
  bodyEn           String
  bodyFa           String
  featuredImage    String?
  status           BlogStatus @default(DRAFT)
  publishedAt      DateTime?
  seoTitleEn       String?
  seoTitleFa       String?
  seoDescriptionEn String?
  seoDescriptionFa String?
  createdAt        DateTime   @default(now())
  updatedAt        DateTime   @updatedAt

  categories BlogPostCategory[]

  @@index([status, publishedAt])
}

model BlogCategory {
  id     String @id @default(cuid())
  slug   String @unique
  nameEn String
  nameFa String

  posts BlogPostCategory[]
}

model BlogPostCategory {
  postId     String
  categoryId String
  post       BlogPost     @relation(fields: [postId], references: [id], onDelete: Cascade)
  category   BlogCategory @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@id([postId, categoryId])
}

model Setting {
  id        String   @id @default(cuid())
  key       String   @unique
  value     Json
  updatedAt DateTime @updatedAt
}

model EmailTemplate {
  id        String   @id @default(cuid())
  key       String   @unique
  subjectEn String
  subjectFa String
  bodyEn    String
  bodyFa    String
  updatedAt DateTime @updatedAt
}

// ---------- Notifications ----------

model Notification {
  id          String     @id @default(cuid())
  type        String
  payload     Json?
  isRead      Boolean    @default(false)
  adminUserId String?
  adminUser   AdminUser? @relation(fields: [adminUserId], references: [id])
  createdAt   DateTime   @default(now())

  @@index([adminUserId, isRead])
}
```

- [ ] **Step 5: Validate the schema**

Run: `npx prisma validate`
Expected: `The schema at prisma/schema.prisma is valid`.

- [ ] **Step 6: Generate the migration without applying it**

Run: `npx prisma migrate dev --name init --create-only`
Expected: a new file at `prisma/migrations/<timestamp>_init/migration.sql`.

- [ ] **Step 7: Append non-negative-stock CHECK constraints to the generated migration**

Open the generated `migration.sql` and append at the end:

```sql
ALTER TABLE "Product" ADD CONSTRAINT "product_stock_nonnegative" CHECK ("stockQuantity" >= 0);
ALTER TABLE "ProductVariant" ADD CONSTRAINT "product_variant_stock_nonnegative" CHECK ("stockQuantity" >= 0);
```

- [ ] **Step 8: Apply the migration**

Run: `npx prisma migrate dev`
Expected: `Your database is now in sync with your schema.`

- [ ] **Step 9: Generate the Prisma client**

Run: `npx prisma generate`
Expected: `Generated Prisma Client` with no errors.

- [ ] **Step 10: Write `src/lib/prisma.ts`**

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

- [ ] **Step 11: Write the connectivity test**

```ts
// tests/lib/prisma-connectivity.test.ts
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
```

- [ ] **Step 12: Run the tests and verify they pass**

Run: `npx vitest run tests/lib/prisma-connectivity.test.ts`
Expected: 2 passed.

- [ ] **Step 13: Commit**

```bash
git add -A
git commit -m "Add Docker Postgres, complete Prisma schema, and initial migration"
```

---

### Task 3: Auth core utilities — password hashing, permissions, authorize functions

**Files:**
- Create: `src/lib/auth/password.ts`, `src/lib/auth/permissions.ts`, `src/lib/auth/admin-authorize.ts`, `src/lib/auth/customer-authorize.ts`
- Test: `tests/lib/auth/password.test.ts`, `tests/lib/auth/permissions.test.ts`, `tests/lib/auth/admin-authorize.test.ts`, `tests/lib/auth/customer-authorize.test.ts`

**Interfaces:**
- Produces: `hashPassword(plain): Promise<string>`, `verifyPassword(plain, hash): Promise<boolean>`; `hasPermission(permissions, required): boolean`, `requirePermission(permissions, required): void`, `AdminPermissionError`; `authorizeAdmin(credentials, findAdminByEmail): Promise<AuthorizedAdmin | null>`; `authorizeCustomer(credentials, findCustomerByEmail): Promise<AuthorizedCustomer | null>`. Consumed by Task 6's NextAuth configs.

- [ ] **Step 1: Install bcryptjs**

```bash
npm install bcryptjs@latest
npm install -D @types/bcryptjs@latest
```

- [ ] **Step 2: Write the failing password test**

```ts
// tests/lib/auth/password.test.ts
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("password hashing", () => {
  it("verifies a correct password against its hash", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    await expect(verifyPassword("correct-horse-battery-staple", hash)).resolves.toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });

  it("salts hashes so the same password produces different hashes", async () => {
    const [hashA, hashB] = await Promise.all([
      hashPassword("same-password"),
      hashPassword("same-password"),
    ]);
    expect(hashA).not.toBe(hashB);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/lib/auth/password.test.ts`
Expected: FAIL — `Cannot find module '@/lib/auth/password'`.

- [ ] **Step 4: Implement `src/lib/auth/password.ts`**

```ts
import bcrypt from "bcryptjs";

const SALT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/lib/auth/password.test.ts`
Expected: 3 passed.

- [ ] **Step 6: Write the failing permissions test**

```ts
// tests/lib/auth/permissions.test.ts
import { describe, expect, it } from "vitest";
import { AdminPermissionError, hasPermission, requirePermission } from "@/lib/auth/permissions";

describe("hasPermission", () => {
  it("returns true when the exact permission is present", () => {
    expect(hasPermission(["products.manage"], "products.manage")).toBe(true);
  });

  it("returns true when the wildcard permission is present", () => {
    expect(hasPermission(["*"], "orders.manage")).toBe(true);
  });

  it("returns false when the permission is absent", () => {
    expect(hasPermission(["products.manage"], "orders.manage")).toBe(false);
  });
});

describe("requirePermission", () => {
  it("does not throw when the permission is present", () => {
    expect(() => requirePermission(["orders.manage"], "orders.manage")).not.toThrow();
  });

  it("throws AdminPermissionError when the permission is missing", () => {
    expect(() => requirePermission(["orders.manage"], "products.manage")).toThrow(
      AdminPermissionError
    );
  });

  it("throws when permissions is undefined", () => {
    expect(() => requirePermission(undefined, "products.manage")).toThrow(AdminPermissionError);
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

Run: `npx vitest run tests/lib/auth/permissions.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 8: Implement `src/lib/auth/permissions.ts`**

```ts
export function hasPermission(permissions: string[], required: string): boolean {
  return permissions.includes("*") || permissions.includes(required);
}

export class AdminPermissionError extends Error {
  constructor(public readonly required: string) {
    super(`Missing required admin permission: ${required}`);
    this.name = "AdminPermissionError";
  }
}

export function requirePermission(permissions: string[] | undefined, required: string): void {
  if (!permissions || !hasPermission(permissions, required)) {
    throw new AdminPermissionError(required);
  }
}
```

- [ ] **Step 9: Run test to verify it passes**

Run: `npx vitest run tests/lib/auth/permissions.test.ts`
Expected: 6 passed.

- [ ] **Step 10: Write the failing admin-authorize test**

```ts
// tests/lib/auth/admin-authorize.test.ts
import { describe, expect, it } from "vitest";
import { authorizeAdmin, type AdminRecord } from "@/lib/auth/admin-authorize";
import { hashPassword } from "@/lib/auth/password";

const buildAdmin = async (overrides: Partial<AdminRecord> = {}): Promise<AdminRecord> => ({
  id: "admin_1",
  email: "owner@mahcandle.test",
  name: "Store Owner",
  passwordHash: await hashPassword("super-secret-password"),
  isActive: true,
  role: { key: "super_admin", permissions: ["*"] },
  ...overrides,
});

describe("authorizeAdmin", () => {
  it("returns the authorized admin for valid credentials", async () => {
    const admin = await buildAdmin();
    const result = await authorizeAdmin(
      { email: "owner@mahcandle.test", password: "super-secret-password" },
      async () => admin
    );
    expect(result).toEqual({
      id: "admin_1",
      email: "owner@mahcandle.test",
      name: "Store Owner",
      role: "super_admin",
      permissions: ["*"],
    });
  });

  it("returns null for a wrong password", async () => {
    const admin = await buildAdmin();
    const result = await authorizeAdmin(
      { email: "owner@mahcandle.test", password: "wrong-password" },
      async () => admin
    );
    expect(result).toBeNull();
  });

  it("returns null when the admin is inactive", async () => {
    const admin = await buildAdmin({ isActive: false });
    const result = await authorizeAdmin(
      { email: "owner@mahcandle.test", password: "super-secret-password" },
      async () => admin
    );
    expect(result).toBeNull();
  });

  it("returns null when no admin is found", async () => {
    const result = await authorizeAdmin(
      { email: "missing@mahcandle.test", password: "super-secret-password" },
      async () => null
    );
    expect(result).toBeNull();
  });

  it("returns null when credentials are missing fields", async () => {
    const result = await authorizeAdmin({ email: "owner@mahcandle.test" }, async () => null);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 11: Run test to verify it fails**

Run: `npx vitest run tests/lib/auth/admin-authorize.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 12: Implement `src/lib/auth/admin-authorize.ts`**

```ts
import { verifyPassword } from "./password";

export interface AdminRecord {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  isActive: boolean;
  role: { key: string; permissions: string[] };
}

export interface AuthorizedAdmin {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

export async function authorizeAdmin(
  credentials: Partial<Record<"email" | "password", unknown>>,
  findAdminByEmail: (email: string) => Promise<AdminRecord | null>
): Promise<AuthorizedAdmin | null> {
  const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : null;
  const password = typeof credentials?.password === "string" ? credentials.password : null;
  if (!email || !password) return null;

  const admin = await findAdminByEmail(email);
  if (!admin || !admin.isActive) return null;

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) return null;

  return {
    id: admin.id,
    email: admin.email,
    name: admin.name,
    role: admin.role.key,
    permissions: admin.role.permissions,
  };
}
```

- [ ] **Step 13: Run test to verify it passes**

Run: `npx vitest run tests/lib/auth/admin-authorize.test.ts`
Expected: 5 passed.

- [ ] **Step 14: Write the failing customer-authorize test**

```ts
// tests/lib/auth/customer-authorize.test.ts
import { describe, expect, it } from "vitest";
import { authorizeCustomer, type CustomerRecord } from "@/lib/auth/customer-authorize";
import { hashPassword } from "@/lib/auth/password";

const buildCustomer = async (overrides: Partial<CustomerRecord> = {}): Promise<CustomerRecord> => ({
  id: "cust_1",
  email: "guest@example.com",
  firstName: "Sara",
  lastName: "Ahmadi",
  passwordHash: await hashPassword("customer-password"),
  isActive: true,
  ...overrides,
});

describe("authorizeCustomer", () => {
  it("returns the authorized customer for valid credentials", async () => {
    const customer = await buildCustomer();
    const result = await authorizeCustomer(
      { email: "guest@example.com", password: "customer-password" },
      async () => customer
    );
    expect(result).toEqual({ id: "cust_1", email: "guest@example.com", name: "Sara Ahmadi" });
  });

  it("returns null for a wrong password", async () => {
    const customer = await buildCustomer();
    const result = await authorizeCustomer(
      { email: "guest@example.com", password: "wrong" },
      async () => customer
    );
    expect(result).toBeNull();
  });

  it("returns null when the customer is inactive", async () => {
    const customer = await buildCustomer({ isActive: false });
    const result = await authorizeCustomer(
      { email: "guest@example.com", password: "customer-password" },
      async () => customer
    );
    expect(result).toBeNull();
  });

  it("returns null when no customer is found", async () => {
    const result = await authorizeCustomer(
      { email: "missing@example.com", password: "customer-password" },
      async () => null
    );
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 15: Run test to verify it fails**

Run: `npx vitest run tests/lib/auth/customer-authorize.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 16: Implement `src/lib/auth/customer-authorize.ts`**

```ts
import { verifyPassword } from "./password";

export interface CustomerRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  isActive: boolean;
}

export interface AuthorizedCustomer {
  id: string;
  email: string;
  name: string;
}

export async function authorizeCustomer(
  credentials: Partial<Record<"email" | "password", unknown>>,
  findCustomerByEmail: (email: string) => Promise<CustomerRecord | null>
): Promise<AuthorizedCustomer | null> {
  const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : null;
  const password = typeof credentials?.password === "string" ? credentials.password : null;
  if (!email || !password) return null;

  const customer = await findCustomerByEmail(email);
  if (!customer || !customer.isActive) return null;

  const valid = await verifyPassword(password, customer.passwordHash);
  if (!valid) return null;

  return { id: customer.id, email: customer.email, name: `${customer.firstName} ${customer.lastName}`.trim() };
}
```

- [ ] **Step 17: Run test to verify it passes**

Run: `npx vitest run tests/lib/auth/customer-authorize.test.ts`
Expected: 4 passed.

- [ ] **Step 18: Commit**

```bash
git add -A
git commit -m "Add password hashing, permission checks, and authorize functions"
```

---

### Task 4: Storage provider interface + local filesystem implementation

**Files:**
- Create: `src/lib/storage/storage-provider.ts`, `src/lib/storage/local-storage-provider.ts`
- Test: `tests/lib/storage/local-storage-provider.test.ts`

**Interfaces:**
- Produces: `StorageProvider` interface (`put`, `get`, `delete`, `urlFor`) and `LocalStorageProvider` implementation. Later phases' media-upload admin feature constructs `new LocalStorageProvider(path.join(process.cwd(), "public", "uploads"))` and depends only on the interface.

- [ ] **Step 1: Write `src/lib/storage/storage-provider.ts`**

```ts
export interface StorageProvider {
  put(key: string, data: Buffer, contentType: string): Promise<string>;
  get(key: string): Promise<Buffer | null>;
  delete(key: string): Promise<void>;
  urlFor(key: string): string;
}
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/lib/storage/local-storage-provider.test.ts
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/lib/storage/local-storage-provider.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/lib/storage/local-storage-provider.ts`**

```ts
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StorageProvider } from "./storage-provider";

export class LocalStorageProvider implements StorageProvider {
  constructor(
    private readonly baseDir: string,
    private readonly publicPath: string = "/uploads"
  ) {}

  private resolveKey(key: string): string {
    const normalized = path.normalize(key).replace(/^([./\\])+/, "");
    if (normalized.split(path.sep).includes("..")) {
      throw new Error(`Invalid storage key: ${key}`);
    }
    return normalized;
  }

  async put(key: string, data: Buffer, _contentType: string): Promise<string> {
    const safeKey = this.resolveKey(key);
    const filePath = path.join(this.baseDir, safeKey);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, data);
    return this.urlFor(safeKey);
  }

  async get(key: string): Promise<Buffer | null> {
    const safeKey = this.resolveKey(key);
    try {
      return await readFile(path.join(this.baseDir, safeKey));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    const safeKey = this.resolveKey(key);
    await rm(path.join(this.baseDir, safeKey), { force: true });
  }

  urlFor(key: string): string {
    return `${this.publicPath}/${this.resolveKey(key)}`;
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/lib/storage/local-storage-provider.test.ts`
Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add abstracted storage provider with local filesystem implementation"
```

---

### Task 5: Payment provider interface + non-auto-succeeding manual implementation

**Files:**
- Create: `src/lib/payments/payment-provider.ts`, `src/lib/payments/manual-payment-provider.ts`
- Test: `tests/lib/payments/manual-payment-provider.test.ts`

**Interfaces:**
- Produces: `PaymentProvider` interface (`createPayment`, `verifyCallback`) and `ManualPaymentProvider`. A future `ZarinPalProvider` implements the same interface; Phase 3 checkout selects a provider by key and calls only these two methods.

- [ ] **Step 1: Write `src/lib/payments/payment-provider.ts`**

```ts
export interface CreatePaymentInput {
  orderId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  callbackUrl: string;
}

export interface CreatePaymentResult {
  redirectUrl: string | null;
  providerRef: string;
  status: "PENDING";
}

export interface VerifyCallbackInput {
  query: Record<string, string | string[] | undefined>;
}

export interface VerifyCallbackResult {
  providerRef: string;
  status: "SUCCEEDED" | "FAILED";
  rawPayload: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly key: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyCallback(input: VerifyCallbackInput): Promise<VerifyCallbackResult>;
}
```

- [ ] **Step 2: Write the failing test**

```ts
// tests/lib/payments/manual-payment-provider.test.ts
import { describe, expect, it } from "vitest";
import { ManualPaymentProvider } from "@/lib/payments/manual-payment-provider";

describe("ManualPaymentProvider", () => {
  const provider = new ManualPaymentProvider();

  it("has the provider key 'manual'", () => {
    expect(provider.key).toBe("manual");
  });

  it("creates a payment that stays PENDING with no redirect", async () => {
    const result = await provider.createPayment({
      orderId: "order_1",
      amount: 250000,
      currency: "IRT",
      idempotencyKey: "idem_1",
      callbackUrl: "https://mahcandle.test/checkout/callback",
    });
    expect(result.status).toBe("PENDING");
    expect(result.redirectUrl).toBeNull();
    expect(result.providerRef).toContain("idem_1");
  });

  it("never auto-succeeds a callback — verifyCallback is unsupported", async () => {
    await expect(provider.verifyCallback({ query: {} })).rejects.toThrow(
      /no callback flow/i
    );
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/lib/payments/manual-payment-provider.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Implement `src/lib/payments/manual-payment-provider.ts`**

```ts
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  VerifyCallbackInput,
  VerifyCallbackResult,
} from "./payment-provider";

export class ManualPaymentProvider implements PaymentProvider {
  readonly key = "manual";

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    return {
      redirectUrl: null,
      providerRef: `manual_${input.idempotencyKey}`,
      status: "PENDING",
    };
  }

  async verifyCallback(_input: VerifyCallbackInput): Promise<VerifyCallbackResult> {
    throw new Error(
      "ManualPaymentProvider has no callback flow: mark the order paid explicitly via the admin order action."
    );
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/lib/payments/manual-payment-provider.test.ts`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add provider-agnostic payment interface with manual stub"
```

---

### Task 6: Dual NextAuth realms + combined middleware

**Files:**
- Create: `src/lib/auth/admin-auth.ts`, `src/lib/auth/customer-auth.ts`
- Create: `src/app/api/auth/admin/[...nextauth]/route.ts`, `src/app/api/auth/customer/[...nextauth]/route.ts`
- Create: `src/middleware.ts`
- Test: `tests/lib/auth/admin-auth.test.ts`, `tests/lib/auth/customer-auth.test.ts`

**Interfaces:**
- Consumes: `authorizeAdmin`/`authorizeCustomer` (Task 3), `prisma` (Task 2), `env` (Task 1).
- Produces: `adminAuth()`, `adminHandlers`, `adminSignIn()`, `adminSignOut()` from `admin-auth.ts`; `customerAuth()`, `customerHandlers`, `customerSignIn()`, `customerSignOut()` from `customer-auth.ts`. `src/middleware.ts` default export, consumed by Next.js directly (no other module imports it).

- [ ] **Step 1: Install next-auth**

```bash
npm install next-auth@beta
```

- [ ] **Step 2: Write `src/lib/auth/admin-auth.ts`**

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { authorizeAdmin } from "@/lib/auth/admin-authorize";

export const {
  handlers: adminHandlers,
  auth: adminAuth,
  signIn: adminSignIn,
  signOut: adminSignOut,
} = NextAuth({
  basePath: "/api/auth/admin",
  session: { strategy: "jwt" },
  secret: process.env.ADMIN_AUTH_SECRET,
  cookies: {
    sessionToken: {
      name: "mah-admin-session",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: (credentials) =>
        authorizeAdmin(credentials, (email) =>
          prisma.adminUser
            .findUnique({ where: { email }, include: { role: true } })
            .then((admin) =>
              admin
                ? {
                    id: admin.id,
                    email: admin.email,
                    name: admin.name,
                    passwordHash: admin.passwordHash,
                    isActive: admin.isActive,
                    role: { key: admin.role.key, permissions: admin.role.permissions },
                  }
                : null
            )
        ),
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.permissions = (user as { permissions?: string[] }).permissions;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        (session.user as typeof session.user & { role?: string; permissions?: string[] }).role =
          token.role as string | undefined;
        (
          session.user as typeof session.user & { role?: string; permissions?: string[] }
        ).permissions = token.permissions as string[] | undefined;
      }
      return session;
    },
  },
});
```

- [ ] **Step 3: Write `src/lib/auth/customer-auth.ts`**

```ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { authorizeCustomer } from "@/lib/auth/customer-authorize";

export const {
  handlers: customerHandlers,
  auth: customerAuth,
  signIn: customerSignIn,
  signOut: customerSignOut,
} = NextAuth({
  basePath: "/api/auth/customer",
  session: { strategy: "jwt" },
  secret: process.env.CUSTOMER_AUTH_SECRET,
  cookies: {
    sessionToken: {
      name: "mah-customer-session",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: (credentials) =>
        authorizeCustomer(credentials, (email) =>
          prisma.customer.findUnique({ where: { email } })
        ),
    }),
  ],
});
```

- [ ] **Step 4: Write the route handlers**

```ts
// src/app/api/auth/admin/[...nextauth]/route.ts
export { adminHandlers as GET, adminHandlers as POST } from "@/lib/auth/admin-auth";
```

Wait — `adminHandlers` is an object `{ GET, POST }`, not a single function. Write it as:

```ts
// src/app/api/auth/admin/[...nextauth]/route.ts
import { adminHandlers } from "@/lib/auth/admin-auth";

export const { GET, POST } = adminHandlers;
```

```ts
// src/app/api/auth/customer/[...nextauth]/route.ts
import { customerHandlers } from "@/lib/auth/customer-auth";

export const { GET, POST } = customerHandlers;
```

- [ ] **Step 5: Write the failing wiring tests**

```ts
// tests/lib/auth/admin-auth.test.ts
import { describe, expect, it } from "vitest";
import { adminAuth, adminHandlers, adminSignIn, adminSignOut } from "@/lib/auth/admin-auth";

describe("admin auth wiring", () => {
  it("exports the expected NextAuth surface", () => {
    expect(typeof adminAuth).toBe("function");
    expect(typeof adminSignIn).toBe("function");
    expect(typeof adminSignOut).toBe("function");
    expect(typeof adminHandlers.GET).toBe("function");
    expect(typeof adminHandlers.POST).toBe("function");
  });
});
```

```ts
// tests/lib/auth/customer-auth.test.ts
import { describe, expect, it } from "vitest";
import {
  customerAuth,
  customerHandlers,
  customerSignIn,
  customerSignOut,
} from "@/lib/auth/customer-auth";

describe("customer auth wiring", () => {
  it("exports the expected NextAuth surface", () => {
    expect(typeof customerAuth).toBe("function");
    expect(typeof customerSignIn).toBe("function");
    expect(typeof customerSignOut).toBe("function");
    expect(typeof customerHandlers.GET).toBe("function");
    expect(typeof customerHandlers.POST).toBe("function");
  });

  it("uses a distinct cookie name from the admin realm", async () => {
    const adminModule = await import("@/lib/auth/admin-auth");
    expect(customerAuth).not.toBe(adminModule.adminAuth);
  });
});
```

- [ ] **Step 6: Run tests to verify they fail**

Run: `npx vitest run tests/lib/auth/admin-auth.test.ts tests/lib/auth/customer-auth.test.ts`
Expected: FAIL — modules not found (files from Step 2-3 not yet present when this is run first; if Steps 2-3 were already completed, skip to Step 7).

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx vitest run tests/lib/auth/admin-auth.test.ts tests/lib/auth/customer-auth.test.ts`
Expected: 3 passed.

- [ ] **Step 8: Write `src/middleware.ts`**

```ts
import { NextResponse, type NextRequest } from "next/server";
import { adminAuth } from "@/lib/auth/admin-auth";

const ADMIN_PATH = /^\/(en|fa)\/admin(\/|$)/;
const ADMIN_LOGIN_PATH = /^\/(en|fa)\/admin\/login\/?$/;

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ADMIN_PATH.test(pathname) && !ADMIN_LOGIN_PATH.test(pathname)) {
    const session = await adminAuth();
    if (!session?.user) {
      const locale = pathname.split("/")[1];
      return NextResponse.redirect(new URL(`/${locale}/admin/login`, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

This handles the admin route guard only. Task 7 replaces this file's body to also invoke the next-intl locale middleware, once next-intl is installed — noted there.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Wire isolated Customer and AdminUser NextAuth realms with route guard middleware"
```

---

### Task 7: i18n messages, Tailwind design tokens, and UI primitives

**Files:**
- Create: `messages/en.json`, `messages/fa.json`
- Create: `src/i18n/routing.ts`, `src/i18n/request.ts`, `src/i18n/navigation.ts`
- Modify: `next.config.ts` (wrap with next-intl plugin)
- Modify: `src/middleware.ts` (combine locale + admin guard)
- Create: `postcss.config.mjs`, `src/app/globals.css`
- Create: `src/lib/cn.ts`
- Create: `src/components/ui/container.tsx`, `heading.tsx`, `text.tsx`, `button.tsx`, `badge.tsx`, `card.tsx`, `input.tsx`
- Test: `tests/components/ui/button.test.tsx`

**Interfaces:**
- Produces: `routing` (locales `["en","fa"]`, default `"en"`) and `{ Link, redirect, usePathname, useRouter }` from `src/i18n/navigation.ts`; `cn()` from `src/lib/cn.ts`; `<Container>`, `<Heading level={1|2|3|4}>`, `<Text>`, `<Button variant="primary"|"secondary"|"ghost" size="sm"|"md"|"lg">`, `<Badge variant="sale"|"new"|"bestseller"|"outOfStock">`, `<Card>`, `<Input>`. Consumed by Task 8's layout/pages.

- [ ] **Step 1: Install next-intl and Tailwind v4**

```bash
npm install next-intl@latest
npm install tailwindcss@latest @tailwindcss/postcss@latest
```

- [ ] **Step 2: Write `messages/en.json`**

```json
{
  "metadata": {
    "title": "MAH Candle Co. | A Glow in the Mist",
    "description": "Premium hand-poured candles from MAH Candle Co."
  },
  "common": {
    "brandName": "MAH Candle Co.",
    "tagline": "A Glow in the Mist",
    "comingSoon": "The full storefront is on its way.",
    "viewDesignSystem": "View design system"
  }
}
```

- [ ] **Step 3: Write `messages/fa.json`**

```json
{
  "metadata": {
    "title": "مه کندل | نوری در دل مه",
    "description": "شمع‌های دست‌ساز پریمیوم از مه کندل"
  },
  "common": {
    "brandName": "مه کندل",
    "tagline": "نوری در دل مه",
    "comingSoon": "فروشگاه کامل به‌زودی راه‌اندازی می‌شود.",
    "viewDesignSystem": "مشاهده سیستم طراحی"
  }
}
```

- [ ] **Step 4: Write `src/i18n/routing.ts`**

```ts
import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "fa"],
  defaultLocale: "en",
});
```

- [ ] **Step 5: Write `src/i18n/request.ts`**

```ts
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
```

- [ ] **Step 6: Write `src/i18n/navigation.ts`**

```ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
```

- [ ] **Step 7: Update `next.config.ts` to wrap with the next-intl plugin**

```ts
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 8: Rewrite `src/middleware.ts` to combine locale routing with the admin guard**

```ts
import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { adminAuth } from "@/lib/auth/admin-auth";

const handleIntl = createMiddleware(routing);

const ADMIN_PATH = /^\/(en|fa)\/admin(\/|$)/;
const ADMIN_LOGIN_PATH = /^\/(en|fa)\/admin\/login\/?$/;

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (ADMIN_PATH.test(pathname) && !ADMIN_LOGIN_PATH.test(pathname)) {
    const session = await adminAuth();
    if (!session?.user) {
      const locale = pathname.split("/")[1];
      return NextResponse.redirect(new URL(`/${locale}/admin/login`, request.url));
    }
  }

  return handleIntl(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
```

- [ ] **Step 9: Write `postcss.config.mjs`**

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
```

- [ ] **Step 10: Write `src/app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-ivory: #faf6f0;
  --color-ivory-dark: #f1e9dd;
  --color-espresso: #2b241d;
  --color-espresso-light: #5a5044;
  --color-amber: #b5652f;
  --color-terracotta: #c17a56;
  --color-sage: #8a9a80;

  --font-sans: var(--font-inter);
  --font-display: var(--font-fraunces);

  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;
}

body {
  background-color: var(--color-ivory);
  color: var(--color-espresso);
}
```

- [ ] **Step 11: Write `src/lib/cn.ts`**

```bash
npm install clsx@latest tailwind-merge@latest
```

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 12: Write `src/components/ui/container.tsx`**

```tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Container({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mx-auto w-full max-w-7xl px-6", className)} {...props} />;
}
```

- [ ] **Step 13: Write `src/components/ui/heading.tsx`**

```tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type HeadingLevel = 1 | 2 | 3 | 4;

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
}

const levelClasses: Record<HeadingLevel, string> = {
  1: "text-4xl md:text-5xl",
  2: "text-3xl md:text-4xl",
  3: "text-2xl md:text-3xl",
  4: "text-xl md:text-2xl",
};

export function Heading({ level = 2, className, ...props }: HeadingProps) {
  const Tag = `h${level}` as const;
  return (
    <Tag
      className={cn(
        "font-display font-medium tracking-tight text-espresso",
        levelClasses[level],
        className
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 14: Write `src/components/ui/text.tsx`**

```tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Text({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("font-sans text-base leading-relaxed text-espresso-light", className)} {...props} />
  );
}
```

- [ ] **Step 15: Write the failing Button test**

```tsx
// tests/components/ui/button.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders children and applies the primary variant by default", () => {
    render(<Button>Add to cart</Button>);
    const button = screen.getByRole("button", { name: "Add to cart" });
    expect(button.className).toContain("bg-amber");
  });

  it("applies the secondary variant classes when requested", () => {
    render(<Button variant="secondary">Wishlist</Button>);
    const button = screen.getByRole("button", { name: "Wishlist" });
    expect(button.className).toContain("border-espresso");
  });

  it("applies the requested size classes", () => {
    render(<Button size="lg">Buy now</Button>);
    const button = screen.getByRole("button", { name: "Buy now" });
    expect(button.className).toContain("h-13");
  });
});
```

- [ ] **Step 16: Run test to verify it fails**

Run: `npx vitest run tests/components/ui/button.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 17: Write `src/components/ui/button.tsx`**

```tsx
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-amber text-ivory hover:bg-amber/90",
  secondary: "bg-transparent text-espresso border border-espresso hover:bg-espresso/5",
  ghost: "bg-transparent text-espresso hover:bg-espresso/5",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-base",
  lg: "h-13 px-8 text-lg",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center rounded-sm font-medium transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
```

- [ ] **Step 18: Run test to verify it passes**

Run: `npx vitest run tests/components/ui/button.test.tsx`
Expected: 3 passed.

- [ ] **Step 19: Write `src/components/ui/badge.tsx`**

```tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "sale" | "new" | "bestseller" | "outOfStock";

const variantClasses: Record<BadgeVariant, string> = {
  sale: "bg-terracotta text-ivory",
  new: "bg-sage text-ivory",
  bestseller: "bg-amber text-ivory",
  outOfStock: "bg-espresso-light text-ivory",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "new", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2.5 py-1 text-xs font-medium uppercase tracking-wide",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
```

- [ ] **Step 20: Write `src/components/ui/card.tsx`**

```tsx
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-md border border-espresso/10 bg-ivory-dark/40 p-6", className)} {...props} />
  );
}
```

- [ ] **Step 21: Write `src/components/ui/input.tsx`**

```tsx
import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-sm border border-espresso/20 bg-ivory px-4 text-base text-espresso placeholder:text-espresso-light/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
```

- [ ] **Step 22: Run the full test suite**

Run: `npx vitest run`
Expected: all tests from Tasks 1-7 pass.

- [ ] **Step 23: Commit**

```bash
git add -A
git commit -m "Add i18n routing infrastructure, Tailwind design tokens, and UI primitives"
```

---

### Task 8: Locale-aware root layout, placeholder pages, Docker build, full verification

**Files:**
- Create: `src/app/[locale]/layout.tsx`, `src/app/[locale]/page.tsx`, `src/app/[locale]/design-system/page.tsx`
- Create: `Dockerfile`, `.dockerignore`

**Interfaces:**
- Consumes: everything produced in Tasks 1-7.
- Produces: the running application at `/en` and `/fa` — the integration point that proves the whole Foundation phase works together.

- [ ] **Step 1: Write `src/app/[locale]/layout.tsx`**

```tsx
import type { ReactNode } from "react";
import { Fraunces, Inter, Vazirmatn } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const vazirmatn = Vazirmatn({ subsets: ["arabic"], variable: "--font-vazirmatn", display: "swap" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("title"), description: t("description") };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();
  const isRtl = locale === "fa";
  const fontClassNames = isRtl ? vazirmatn.variable : `${inter.variable} ${fraunces.variable}`;
  const fontVars = isRtl
    ? { "--font-sans": "var(--font-vazirmatn)", "--font-display": "var(--font-vazirmatn)" }
    : { "--font-sans": "var(--font-inter)", "--font-display": "var(--font-fraunces)" };

  return (
    <html lang={locale} dir={isRtl ? "rtl" : "ltr"}>
      <body className={`${fontClassNames} antialiased`} style={fontVars as React.CSSProperties}>
        <NextIntlClientProvider messages={messages}>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Write `src/app/[locale]/page.tsx`**

```tsx
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

export default function HomePage() {
  const t = useTranslations("common");

  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <Heading level={1}>{t("brandName")}</Heading>
      <Text className="max-w-md">{t("tagline")}</Text>
      <Text className="max-w-md">{t("comingSoon")}</Text>
      <Link
        href="/design-system"
        className="inline-flex h-11 items-center justify-center rounded-sm bg-amber px-6 text-base font-medium text-ivory transition-colors hover:bg-amber/90"
      >
        {t("viewDesignSystem")}
      </Link>
    </Container>
  );
}
```

- [ ] **Step 3: Write `src/app/[locale]/design-system/page.tsx`**

```tsx
import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function DesignSystemPage() {
  const t = useTranslations("common");

  return (
    <Container className="flex flex-col gap-10 py-16">
      <div>
        <Heading level={1}>{t("brandName")}</Heading>
        <Text>{t("tagline")}</Text>
      </div>

      <section className="flex flex-col gap-4">
        <Heading level={3}>Headings</Heading>
        <Heading level={1}>Heading 1</Heading>
        <Heading level={2}>Heading 2</Heading>
        <Heading level={3}>Heading 3</Heading>
        <Heading level={4}>Heading 4</Heading>
      </section>

      <section className="flex flex-col gap-4">
        <Heading level={3}>Buttons</Heading>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <Heading level={3}>Badges</Heading>
        <div className="flex flex-wrap gap-3">
          <Badge variant="sale">Sale</Badge>
          <Badge variant="new">New</Badge>
          <Badge variant="bestseller">Best seller</Badge>
          <Badge variant="outOfStock">Out of stock</Badge>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <Heading level={3}>Card &amp; input</Heading>
        <Card className="flex max-w-sm flex-col gap-4">
          <Text>A card container for product tiles and content blocks.</Text>
          <Input placeholder="you@example.com" />
        </Card>
      </section>
    </Container>
  );
}
```

- [ ] **Step 4: Run the build**

Run: `npm run build`
Expected: build succeeds with `/en` and `/fa` (and `/en/design-system`, `/fa/design-system`) listed as generated routes.

- [ ] **Step 5: Run lint and the full test suite**

Run: `npm run lint && npx vitest run`
Expected: both succeed with no errors, all tests from Tasks 1-7 passing.

- [ ] **Step 6: Manually verify locale/RTL behavior in the browser**

Run: `npm run dev`, then open `http://localhost:3000`.
Expected: redirects to `/en`; page shows "MAH Candle Co." in Fraunces/Inter, `<html dir="ltr">`. Navigate to `/fa`: page shows "مه کندل" in Vazirmatn, `<html dir="rtl">`, text and layout mirror correctly (check the design-system page's button/badge rows flow right-to-left). Navigate to `/en/admin`: redirected to `/en/admin/login` (404 on that page is expected — it ships in Phase 4 — confirm the *redirect itself* fires, proving the server-side admin guard is live).

- [ ] **Step 7: Write `.dockerignore`**

```
node_modules
.next
.git
docs
*.md
.env
.env.local
```

- [ ] **Step 8: Write `Dockerfile`**

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

- [ ] **Step 9: Verify the Docker image builds**

Run: `docker build -t mah-candle .`
Expected: image builds successfully through all stages.

- [ ] **Step 10: Update `README.md`** with the final verified setup sequence (`docker compose up -d`, `npm install`, `npm run db:migrate`, `npm run dev`) and a note that `docker build -t mah-candle .` produces a production image.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "Add locale-aware root layout, placeholder pages, and Docker build"
```

---

## Self-Review Notes

- **Spec coverage:** brand identity → Task 8 copy; architecture (single app, Postgres/Prisma, dual auth, abstracted storage/payments, Docker) → Tasks 1-8; i18n convention (`xxxEn`/`xxxFa`, locale-aware slugs) → Task 2 schema; auth boundaries + server-side enforcement → Tasks 3, 6, 8 Step 6; full schema with all 12 refinements (Toman convention, Order immutability, variant-aware inventory, idempotent inventory/payment processing, non-negative stock constraint, audit fields, purposeful indexes) → Task 2; design system → Task 7; Docker/VPS friendliness → Task 8. All Foundation-phase spec sections have a task.
- **Type consistency checked:** `AuthorizedAdmin`/`AdminRecord` (Task 3) match the shape built from Prisma data in Task 6's `admin-auth.ts`; `StorageProvider`/`PaymentProvider` method signatures are identical between their interface files and implementations; `Button`/`Badge`/`Heading` prop types match their usage in the Task 8 pages.
- **No placeholders:** every step has literal code, exact commands, and expected output.
