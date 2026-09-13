# Foundation Phase Design — مه کندل / MAH Candle Co.

Status: approved by user (iterative chat review, 2026-09-13)
Phase: 1 of 5 (Foundation → Storefront → Checkout/Orders → Admin core → CMS/extras)

## 1. Brand identity

- Persian name: **مه کندل** ("meh" = mist/fog). English: **MAH Candle Co.** (avoids the
  "meh" slang collision; "mah" is a common alternate transliteration).
- Tagline: "A Glow in the Mist" (EN) / "نوری در دل مه" (FA).
- Palette: warm ivory/cream base, espresso-charcoal text, burnt-amber primary accent,
  muted terracotta/sage secondary accents. Premium minimal, not "candle-emoji" cute.
- Typography: Fraunces (serif display, EN headings) + Inter (EN body/UI) + Vazirmatn
  (FA display and body — carries both roles since elegant Persian serifs are unreliable
  on the web).
- Visual style: large product photography, generous whitespace, hairline borders over
  heavy shadows, subtle scroll-in transitions only.
- Product imagery for this build: curated free-license stock photography / styled
  placeholder tiles — not scraped from any existing brand.

## 2. Phase scope

**In scope (Foundation):**
- Next.js project scaffold (App Router, TypeScript, single app)
- `/en` and `/fa` locale routing via `next-intl`, full RTL/LTR awareness
- Complete Prisma schema + initial migration (covers all entities needed through
  Phase 5, so later phases build on it without restructuring)
- Docker Compose for local Postgres
- Dual, isolated auth realms (Customer / AdminUser) — schema, session/cookie
  separation, and a server-side permission-check utility — but not the full
  login UI/flows (that lands with the features that need them in Phase 2/4)
- Design system: Tailwind config with brand tokens, base primitives (Button, Card,
  Badge, Input, Container, Typography), locale-aware layout shell
- Base config: ESLint, Prettier, env schema/validation, README for local setup

**Out of scope (later phases):** storefront pages, cart/checkout, admin UI, CMS
content editing, payments beyond the interface + stub provider, seed data.

## 3. Architecture

- Next.js 15 App Router, TypeScript, one deployable app.
- Postgres (Docker Compose locally) + Prisma ORM. Server Components / Route
  Handlers / Server Actions talk to Prisma directly — no separate API service.
- Auth.js (NextAuth) v5, two independent configurations: a customer auth instance
  and an admin auth instance, separate cookie names, separate session tables,
  separate middleware matchers. Admin routes additionally re-check role/permission
  server-side on every request — client-side role state is never trusted.
- Storage: local filesystem under `/public/uploads`, behind a `StorageProvider`
  interface (`put`, `get`, `delete`, `urlFor`) so an S3-compatible backend can be
  swapped in later without touching callers.
- Payments: a `PaymentProvider` interface (`createPayment`, `verifyCallback`,
  `refund`) implemented now by a `ManualPaymentProvider` (pending until an admin
  manually marks paid — no fake auto-success path). A `ZarinPalProvider` can
  implement the same interface later. Provider selection via `Setting`/env, not
  hardcoded.
- Docker/VPS friendly: no platform-specific services (no Vercel-only KV/Blob
  APIs), Dockerfile + docker-compose for app + Postgres.

## 4. Localization convention

- Every translatable field is a literal pair: `xxxEn` / `xxxFa` columns (matches
  the brief's own language and keeps queries simple/typed — no EAV/generic
  translation table). All future fields follow this same pattern.
- Slugs are locale-aware: `slugEn` / `slugFa`, both independently unique, so
  `/en/candles/amber-noir` and `/fa/candles/کهربا-نویر` both resolve to the same
  Product. Category follows the same pattern.
- Money: all `Decimal` monetary fields are denominated in **Toman** (documented
  convention, not a schema field per row). `Payment.currency` defaults to
  `"IRT"`. Any provider needing Rial (e.g. ZarinPal expects Rial) converts
  explicitly at its own boundary (`amount * 10`) — conversion never leaks into
  shared schema or business logic.

## 5. Auth & authorization boundaries

- `Customer` / `CustomerAddress` — storefront identity, separate from admin.
- `AdminUser` / `AdminRole` — `AdminRole.permissions String[]` (simple, admin-
  editable later, no separate permission-entity graph). Seed roles: Super Admin,
  Store Manager, Content Manager, Order Manager, Editor (matches brief section 28).
- Server-side enforcement: a `requireAdminPermission(session, 'products.manage')`
  helper used at the top of every admin server action/route handler; Next.js
  middleware only handles the coarse "is this an authenticated admin session at
  all" redirect, never the fine-grained permission check (that always happens
  server-side, per-action).

## 6. Prisma schema

### Conventions
- `cuid()` ids, `createdAt`/`updatedAt` on every model, `Decimal` for money.
- `deletedAt` (soft delete) only on `Product` and `Category`. `Order` is never
  soft- or hard-deleted — its lifecycle is entirely status-driven
  (Pending → ... → Cancelled/Refunded/Returned), so history stays immutable.

### Catalog
- `Category(id, slugEn @unique, slugFa @unique, nameEn, nameFa, descriptionEn,
  descriptionFa, image, banner, parentId -> self, seoTitleEn/Fa,
  seoDescriptionEn/Fa, isActive, sortOrder, deletedAt, timestamps)`
- `Product(id, slugEn @unique, slugFa @unique, sku @unique, nameEn, nameFa,
  shortDescriptionEn/Fa, descriptionEn/Fa, status enum[Draft,Published,Archived],
  hasVariants Boolean, price, salePrice, costPrice, stockQuantity,
  lowStockThreshold, weight, dimensions Json, waxType, wickType,
  burnTimeMinutes, fragranceFamilyId -> FragranceFamily, fragranceNotesEn/Fa,
  color, size, ingredientsEn/Fa, careInstructionsEn/Fa, safetyInstructionsEn/Fa,
  seoTitleEn/Fa, seoDescriptionEn/Fa, seoKeywordsEn/Fa, isFeatured,
  isNewArrival, isBestSeller, publishedAt, updatedByAdminId -> AdminUser,
  deletedAt, timestamps)`. When `hasVariants=false`, price/stock live directly
  on Product; when `true`, they live on `ProductVariant` rows and the
  Product-level price/stock fields are display fallbacks only (min price, etc.),
  enforced in application logic, not the schema.
- `ProductVariant(id, productId, sku @unique, nameEn, nameFa, size, color,
  fragrance, price, salePrice, stockQuantity, lowStockThreshold, weight,
  barcode, isActive, timestamps)`
- `ProductImage(id, productId, url, altEn, altFa, sortOrder, isPrimary)`
- `ProductCategory(productId, categoryId)` — composite PK, m2m
- `FragranceFamily(id, slugEn @unique, slugFa @unique, nameEn, nameFa,
  descriptionEn/Fa, image)`
- `Tag`/`ProductTag` — m2m, same shape as categories but flat (no nesting)

### Inventory
- `InventoryTransaction(id, productId, variantId?, type
  enum[Sale,ManualAdjustment,Restock,Cancellation,Return], quantityChange Int,
  resultingQuantity Int, orderItemId? @unique-per-type, note,
  createdByAdminId? -> AdminUser, createdAt)`
- `@@unique([orderItemId, type])` — an order item can only ever generate one
  `Sale` transaction (and, independently, one `Return`/`Cancellation`), which is
  the idempotency guard against duplicate payment callbacks double-decrementing
  stock.
- Non-negative stock is enforced two ways: (1) application code always
  decrements via a single conditional `UPDATE ... SET stock = stock - :n WHERE
  stock >= :n` inside the same DB transaction that writes the
  `InventoryTransaction` row, so a race can't oversell; (2) a raw-SQL `CHECK
  (stock_quantity >= 0)` constraint added in the migration as defense-in-depth
  (Prisma's schema DSL has no native CHECK syntax, so this is appended directly
  to the generated migration SQL).

### Cart / Wishlist
- `Cart(id, customerId? -> Customer, sessionToken?, timestamps)` — supports
  guest carts (token) and logged-in carts; merges on login (Phase 3 logic, not
  Foundation).
- `CartItem(id, cartId, productId, variantId?, quantity, unitPrice)`
- `WishlistItem(id, customerId, productId, createdAt)`, `@@unique([customerId,
  productId])`

### Orders / Payments
- `Order(id, orderNumber @unique, customerId? -> Customer, guestEmail?,
  guestPhone?, status enum[Pending,PaymentPending,Paid,Processing,Shipped,
  Delivered,Cancelled,Refunded,Returned], subtotal, discountTotal,
  shippingTotal, taxTotal, grandTotal, currency default "IRT", couponId?,
  shippingAddress Json, billingAddress Json, customerNote, internalNote,
  timestamps)`. Indexes: `@@index([status, createdAt])`,
  `@@index([customerId])`.
- `OrderItem(id, orderId, productId? -> Product (onDelete: SetNull),
  variantId? -> ProductVariant (onDelete: SetNull), productNameEn,
  productNameFa, sku, variantLabelEn?, variantLabelFa?, unitPrice, quantity,
  lineTotal)` — snapshot fields are the source of truth for display, so the
  order stays fully readable even if the product/category is later edited or
  soft-deleted.
- `OrderStatusHistory(id, orderId, status, note, changedByAdminId? ->
  AdminUser, createdAt)` — audit trail for every status change.
- `Payment(id, orderId, provider, status
  enum[Pending,Succeeded,Failed,Refunded,Cancelled], amount, currency default
  "IRT", providerRef? @unique, idempotencyKey @unique, rawPayload Json?,
  timestamps)` — one row per payment *attempt*, so retries are tracked
  individually; `providerRef` uniqueness plus an application check ("has this
  providerRef already been processed?") makes gateway callbacks idempotent.
  Never stores card numbers, CVV, or gateway secrets — only references/status.

### Promotions
- `Coupon(id, code @unique, type enum[Percentage,Fixed], value, appliedTo
  enum[All,Category,Product], categoryId?, productId?, minOrderAmount,
  maxDiscountAmount, startsAt, endsAt, usageLimit, perCustomerLimit,
  usedCount, isActive, timestamps)`
- `CouponUsage(id, couponId, customerId, orderId, createdAt)`,
  `@@unique([couponId, orderId])`

### Reviews
- `Review(id, productId, customerId, rating Int, body, locale, status
  enum[Pending,Approved,Rejected], isFeatured, timestamps)`

### CMS
- `Page(id, slug @unique, titleEn/Fa, bodyEn/Fa, seoTitleEn/Fa,
  seoDescriptionEn/Fa, isPublished, timestamps)` — About/FAQ/Terms/Privacy/
  Shipping/Return.
- `HomepageSection(id, type enum[Hero,FeaturedCategories,BestSellers,
  NewArrivals,Seasonal,ShopByFragrance,PromoBanner,About,Newsletter],
  titleEn/Fa, subtitleEn/Fa, descriptionEn/Fa, imageUrl, ctaLabelEn/Fa,
  ctaLink, secondaryCtaLabelEn/Fa, secondaryCtaLink, badgeEn/Fa, config Json,
  isEnabled, sortOrder, timestamps)` — fixed predefined section types, `config`
  only carries type-specific options (e.g. which category/product ids to
  pull) — deliberately not a generic page builder.
- `MenuItem(id, menu enum[Header,Footer], labelEn/Fa, url, parentId -> self,
  sortOrder, isEnabled)`
- `MediaAsset(id, url, filename, mimeType, size, width, height, altEn, altFa,
  createdByAdminId -> AdminUser, createdAt)`
- `BlogPost(id, slugEn @unique, slugFa @unique, titleEn/Fa, excerptEn/Fa,
  bodyEn/Fa, featuredImage, status enum[Draft,Published,Scheduled],
  publishedAt, seoTitleEn/Fa, seoDescriptionEn/Fa, timestamps)`,
  `BlogCategory`/`BlogPostCategory` (m2m)
- `Setting(id, key @unique, value Json)` — generic store config (general,
  social, store, email, SEO defaults, appearance).
- `EmailTemplate(id, key @unique, subjectEn, subjectFa, bodyEn, bodyFa,
  updatedAt)`

### Notifications
- `Notification(id, type, payload Json, isRead, adminUserId? -> AdminUser,
  createdAt)`

### Indexes/constraints summary
Purposeful, not blanket: unique on every slug/sku/code/email; `@@index` on
foreign keys used in hot filter paths (`Product.status`, `Product.isFeatured`,
`Product.isBestSeller`, `Product.isNewArrival`, `Order.status`,
`Review.status`), composite `(status, createdAt)` on `Order` for admin list
sorting/filtering, `@@unique([orderItemId, type])` on `InventoryTransaction`
and `@@unique([couponId, orderId])` on `CouponUsage` for idempotency.

## 7. Testing / verification for this phase

- `npx prisma validate` — schema is syntactically/referentially valid.
- `npx prisma migrate dev` against the Dockerized Postgres — migration applies
  cleanly from empty DB.
- `npx prisma generate` — client generates without error.
- `next build` — project scaffold compiles (even with placeholder pages).
- Manual check: visiting `/en` and `/fa` renders with correct `dir` attribute
  and swapped fonts, confirming the i18n/RTL wiring works end to end.
