# Storefront Phase Design — مه کندل / MAH Candle Co.

Status: approved by user (iterative chat review, 2026-09-14)
Phase: 2 of 5 (Foundation → **Storefront** → Checkout/Orders → Admin core → CMS/extras)
Builds on: docs/superpowers/specs/2026-09-13-foundation-phase-design.md (Foundation phase, merged to `master`)

## 1. Phase scope

**In scope:**
- Product listing (`/candles`) and category listing (`/candles/[categorySlug]`), URL-driven
  filtering/sorting/pagination
- Product detail page (`/product/[slug]`), with variants, reviews (read-only), related products
- Search (`/search`), Postgres full-text search with autocomplete
- Reusable `ProductCard` (used on listing, homepage, search, wishlist, related products)
- Cart: add/remove/update quantity, guest + logged-in persistence, mini-cart — no checkout yet
- Wishlist (requires a logged-in customer)
- Minimal customer auth: register, login, logout (no email verification, no profile/address
  management — those arrive with checkout/orders in Phase 3)
- Homepage rendered from seeded `HomepageSection` rows (no admin editor yet — that's Phase 5)
- Seed data: categories, fragrance families, tags, ~24 bilingual products (with images, variants,
  reviews), homepage sections, one newsletter-capture table
- Product JSON-LD structured data

**Out of scope (later phases):**
- Checkout, payment, order creation, inventory deduction (Phase 3)
- Stock decrementing (cart only soft-validates against current `stockQuantity`, never writes
  `InventoryTransaction` rows)
- Review submission/moderation (Phase 4, alongside the admin panel that approves them)
- Admin homepage/section builder, media library, any admin UI (Phase 4)
- Customer profile/address management, order history (Phase 3+)
- `sitemap.xml`/`robots.txt` generation, blog, CMS pages (Phase 5)
- Email sending (verification, welcome, etc. — Phase 4/5 alongside email templates)

## 2. Routes & file structure

```
src/app/[locale]/
  page.tsx                          — homepage (renders seeded HomepageSection rows)
  candles/page.tsx                  — product listing (searchParams-driven)
  candles/[categorySlug]/page.tsx   — category listing (same query builder, scoped)
  product/[slug]/page.tsx           — product detail
  search/page.tsx                   — search results
  wishlist/page.tsx                 — customer's wishlist (requires login)
  cart/page.tsx                     — cart page (no checkout CTA yet)
  account/
    login/page.tsx
    register/page.tsx
src/lib/catalog/
  list-products.ts                  — shared typed Prisma query builder (listing/category)
  search-products.ts                — raw-SQL full-text search query (ts_rank)
  product-detail.ts                 — slug resolution + related products
src/lib/cart/
  actions.ts                        — addToCart / updateCartItemQuantity / removeFromCart
  read.ts                           — resolve current cart (cookie or session)
  merge-on-login.ts                 — guest cart → customer cart merge
src/lib/wishlist/
  actions.ts                        — toggleWishlist
src/lib/customer/
  actions.ts                        — registerCustomer
src/components/storefront/
  product-card.tsx, product-grid.tsx, filter-sidebar.tsx, sort-dropdown.tsx,
  pagination.tsx, rating-stars.tsx, quantity-stepper.tsx, quick-view-dialog.tsx,
  variant-selector.tsx (client), mini-cart.tsx (client)
src/components/homepage/
  hero-section.tsx, featured-categories-section.tsx, best-sellers-section.tsx,
  new-arrivals-section.tsx, shop-by-fragrance-section.tsx, promo-banner-section.tsx,
  about-section.tsx, newsletter-section.tsx
prisma/seed.ts                      — categories, fragrance families, tags, products,
                                       variants, images, reviews, homepage sections
```

Slugs resolve via `slugEn`/`slugFa` per the active locale (`/en/candles/amber-noir` and
`/fa/candles/کهربا-نویر` are the same row) — an unmatched slug, a non-`PUBLISHED` product, or a
soft-deleted row all resolve to `notFound()`.

## 3. Data layer additions

Foundation's schema covers almost everything; three small, additive gaps surfaced during design:

- `Product.averageRating Decimal? @db.Decimal(2,1)` and `Product.reviewCount Int @default(0)` —
  denormalized rating cache. Prisma can't `orderBy`/`where` an average over a to-many relation, so
  rating-based filter/sort needs this instead of a per-query aggregate join. Populated by the seed
  script now; a later phase's review-approval flow must recompute it when it exists.
- `NewsletterSubscriber(id, email @unique, createdAt)` — the homepage's Newsletter section needs
  somewhere to write signups; trivial model, trivial Server Action.
- A generated `tsvector` column + GIN index on `Product` for full-text search (`nameEn`, `nameFa`,
  `sku`, `fragranceNotesEn`, `fragranceNotesFa`, `descriptionEn`, `descriptionFa`), using Postgres's
  `'simple'` text-search configuration (no built-in Persian stemming without extra extensions, so
  matching is substring/word-boundary rather than linguistically smart — an accepted, documented
  tradeoff). Added via raw SQL in the migration, same pattern Foundation used for the CHECK
  constraints (Prisma's schema DSL has no native generated-column/tsvector syntax).

New indexes: `@@index([fragranceFamilyId])`, `@@index([status, price])`,
`@@index([status, publishedAt])`, `@@index([status, averageRating])` on `Product` (the first was a
plain gap in Foundation's schema — foreign keys aren't auto-indexed by Prisma).

## 4. Listing, filtering, sorting, pagination, SEO

**Query params** (shared by `/candles` and `/candles/[categorySlug]`):
`category` (only meaningful on `/candles`; the category page gets it from the path)
`minPrice, maxPrice, fragrance, color, size, inStock, bestSeller, newArrival, onSale, minRating,
sort, page`

`sort` ∈ `featured | newest | bestselling | price-asc | price-desc | rating`.

Two intentional simplifications: "Candle type" (from the original brief) maps onto the Category
filter rather than a second taxonomy, since the seed categories already are candle types (Jar,
Pillar, ...); "Scent" and "Fragrance family" collapse into the single `fragrance` filter.

**Query builder:** `list-products.ts` takes `{ locale, categorySlug?, filters, sort, page }` and
builds one typed Prisma `findMany` (`where`/`orderBy`/`skip`/`take`) — both listing routes call it
identically. Price sorting orders by list `price` (not `salePrice`-adjusted — coalescing the two
for ordering needs raw SQL for a case that's otherwise a plain typed query, not worth it yet).
"Best selling" sorts by the existing `isBestSeller` flag (no real sales-ranking data exists until
Phase 3's orders land) — both documented, easy to upgrade later. Only `search-products.ts` (the
text-query path) uses raw SQL, for `ts_rank` ordering; everything else stays on Prisma Client's
typed builder.

**Pagination:** offset-based, `?page=N`, page size 24 — simplest, fine at catalog scale.

**SEO:** canonical URL drops all filter/sort query params, pointing at the bare category/listing
URL (avoids duplicate-content across the filter combinatorics); `page=2+` self-canonicalizes
(current Google guidance, not `rel=next/prev`). Product pages emit `Product` JSON-LD (name, image,
sku, offers/price/availability, `aggregateRating` from the new columns). `sitemap.xml` stays
deferred to Phase 5.

## 5. Product card, product detail, related products

**`ProductCard`** takes the plain data already fetched by the listing/search/homepage query (no
extra fetch per card): image pair with CSS crossfade hover, name, short description, rating stars,
price/salePrice/discount %, badges (New/Best Seller/Sale/Out of Stock), Add to Cart (Server Action
+ `useOptimistic`), Wishlist toggle (same pattern), and Quick View — a client dialog over the same
already-loaded data plus a link to the full page (no new query).

**Product detail page:** gallery with hover-zoom (CSS `scale`, no new dependency), variant selector
when `hasVariants` (client component over server-fetched variants, swaps price/stock/image
client-side), quantity stepper, Add to Cart + Wishlist, full description/fragrance/wax/wick/burn
time/dimensions/ingredients/care/safety content (already on `Product`), read-only reviews under the
`averageRating`/`reviewCount` summary, and related products (same category/fragrance family,
excluding self, limit 6). "Frequently bought together" needs real order co-occurrence data that
doesn't exist until Phase 3 — deferred rather than faked.

**Buy Now:** the brief wants it to jump straight to checkout; since checkout doesn't exist yet,
Phase 2's Buy Now adds to cart and navigates to `/cart` — Phase 3 repoints it once real checkout
exists.

## 6. Cart

Guest identity via an httpOnly `cartToken` cookie (`Cart.sessionToken`, already in Foundation's
schema); on login, a Server Action merges the guest cart into the customer's `Cart` (creating one if
absent, summing matching items, discarding the guest cart, clearing the cookie). Three Server
Actions — `addToCart`, `updateCartItemQuantity`, `removeFromCart` — each resolve the current cart,
soft-cap quantity against `stockQuantity` (no decrementing — Phase 3's job at order time), and
revalidate. A mini-cart (item count + subtotal) wraps the same actions in `useOptimistic`. `/cart`
lists items with quantity/remove controls and a subtotal; **no checkout CTA yet** — a disabled
placeholder would look more broken than simply not having one, and Phase 3 adds "Proceed to
Checkout" onto this same page.

## 7. Wishlist

`toggleWishlist(productId)` Server Action; with no customer session, redirect to
`/account/login?callbackUrl=<current-path>` (standard pattern, no extra modal). `/wishlist` reuses
`ProductCard` with "move to cart" / "remove" actions. `@@unique([customerId, productId])` (already
in the schema) prevents duplicates.

## 8. Customer auth

`/account/register` and `/account/login` are plain Server Action forms. Register hashes the
password (Foundation's `hashPassword`) and signs in immediately after creating the `Customer` row;
login calls the Customer NextAuth realm's credentials sign-in; both honor `callbackUrl`. Logout is a
Server Action in the header. No email verification (`emailVerifiedAt` stays unused until a later
phase adds email sending) and no profile/address management page — intentionally minimal, just
enough for wishlist and a persistent per-customer cart.

## 9. Homepage

Reads `HomepageSection` rows (`isEnabled: true`, ordered by `sortOrder`) and dispatches each `type`
to a matching component, each reading its own `config` JSON. The seed script is the only thing
populating these rows until Phase 5 builds the admin section-builder.

## 10. Seed data

- ~7 categories (Jar/Pillar/Votive/Scented/Luxury/Gift Sets/Seasonal — Seasonal gets nested
  Winter/Autumn children to exercise category nesting)
- The 7 fragrance families from the original brief (Floral, Fruity, Fresh & Clean, Woody, Vanilla,
  Citrus, Sweet & Spicy)
- A handful of tags
- ~24 bilingual products (genuine EN+FA copy, not placeholder text) spanning all
  categories/fragrances, varied prices (some on sale), varied stock (including one out-of-stock),
  a few `isBestSeller`/`isNewArrival`/`isFeatured`, 2-3 products with real size variants, 2-4 seeded
  reviews per product feeding `averageRating`/`reviewCount`
- Product photos: a curated set of specific Unsplash photos (Unsplash License — free for commercial
  use, no attribution required), downloaded once by the seed script into `/public/uploads/seed/`
  and served through the existing `LocalStorageProvider` — one origin, no Next.js
  remote-image-domain config needed
- 8 `HomepageSection` rows (Hero, FeaturedCategories, BestSellers, NewArrivals, ShopByFragrance,
  PromoBanner, About, Newsletter) with real EN/FA copy

## 11. Testing / verification approach

- Unit tests (Vitest) for the catalog query builders (filter/sort/pagination logic), cart Server
  Actions (stock-cap behavior, guest/customer resolution, merge-on-login), and the search query.
- `npx prisma migrate dev` applies the new columns/indexes/tsvector cleanly against the Dockerized
  Postgres from Foundation.
- Manual/browser verification: visiting `/en/candles` and `/fa/candles` with various filter/sort
  combinations, a product detail page in both locales, add-to-cart → mini-cart → `/cart` flow,
  register → login → wishlist toggle → `/wishlist`, and the homepage rendering all 8 seeded
  sections correctly in both locales.
