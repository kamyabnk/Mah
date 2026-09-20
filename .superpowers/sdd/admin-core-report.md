# Core Admin Panel — Implementation Report

Worktree: `D:\proj 5\.worktrees\build-out` (branch `build-out`)
Baseline at start: 88 tests passing, `tsc --noEmit` clean — confirmed before any edit.
Final: **135 tests passing, zero type errors, admin tree lints clean, production build succeeds.**

7 commits, 60 files, +7891 lines:

| Commit | Scope |
|---|---|
| `f0736d7` | Bilingual `admin` translation namespace |
| `ff23f42` | Login, shell, dashboard |
| `57911e1` | Product management |
| `3e68818` | Category management |
| `271a4b8` | Inventory management |
| `9a70bd7` | Orders + customers |
| `97740a6` | Unit tests + nav bug fix |
| `2a839ea` | Force dynamic rendering of the dashboard |

---

## 1. Admin login — `src/app/[locale]/admin/login/page.tsx`

Server Action `loginAdmin` in `src/lib/admin/auth-actions.ts` calls `adminSignIn` on the
AdminUser realm, mirroring `loginCustomer` minus the cart-merge. `redirect()` is called
**outside** the try/catch, because Next implements redirects by throwing and that signal must
not be swallowed. Failure messages are deliberately generic (unknown email, wrong password and
deactivated account all return the same string) so the form never reveals which admin emails
exist.

The page sits **outside** the `(dashboard)` route group, so it renders with no sidebar, and
`src/middleware.ts` already exempts it.

## 2. Layout & shell — `src/app/[locale]/admin/(dashboard)/layout.tsx`

Sidebar (nav grouped Dashboard / Catalog / Sales) + top bar with the signed-in admin's name,
email, role and a logout form. RTL-correct via logical properties (`border-e`, `ps-`,
`text-start`) — verified rendering mirrored at `/fa/admin`.

The layout calls `adminAuth()` itself and redirects if there is no session — defence in depth
alongside the middleware, never relying on the middleware alone. Nav items are filtered with
`hasPermission` (presentation only); the real boundary is `requireAdminPermission` inside each
action and `requireAdminPagePermission` on each page.

## 3. Dashboard — `src/app/[locale]/admin/(dashboard)/page.tsx`

All figures are live aggregates (`src/lib/admin/dashboard/queries.ts`):

- **Sales counted as `PAID | PROCESSING | SHIPPED | DELIVERED`**, documented in a code comment.
  `PENDING`/`PAYMENT_PENDING` are excluded (carts that may never be paid);
  `CANCELLED`/`REFUNDED`/`RETURNED` excluded (money went back out). The customer-spend query
  reuses the same constant so the two views can never disagree.
- Today / month / all-time sales; order counts by status; customer and published-product counts.
- Low-stock uses `prisma.product.fields.lowStockThreshold` — a real column-to-column comparison
  rather than a hardcoded number — across **both** products and variants.
- Best sellers by summed `OrderItem.quantity`, restricted to sales statuses.
- Recent orders (10), recent customers (5), 7-day sales bars. Charts are plain CSS
  (`BarMeter`); **no charting dependency added**.

## 4. Products — `src/app/[locale]/admin/(dashboard)/products/**`

List: search (EN/FA name, SKU), status and category filters, pagination, bulk
publish/unpublish/archive/delete/category-assign. Filters are a plain GET form, so the list
stays shareable and works without JS.

Create/edit form covers every field in the brief in both locales. **Images and variants live on
the edit page only** — a new product redirects to its edit page after create, since images and
variants need a product id to attach to. Images: upload via `LocalStorageProvider`, reorder, set
primary, alt text EN/FA, delete. Variants: full CRUD.

Notable decisions:
- **Deletes are soft** (`deletedAt` + `ARCHIVED`). `OrderItem` keeps a nullable FK to `Product`,
  so hard-deleting would erase product names from historical invoices.
- A variant referenced by an order line is **deactivated, not deleted**, for the same reason.
- Duplicates always start as `DRAFT`, so a half-edited copy can never reach the storefront.
- Deleting an image row does **not** delete the file: `duplicateProduct` makes copies that
  reference the same URL.
- Uploaded filenames are generated (UUID), never taken from the client.

### Stock-sync rule
`syncProductStockFromVariants` (`src/lib/admin/products/stock-sync.ts`) re-derives
`Product.stockQuantity` from `SUM(ProductVariant.stockQuantity)` — same pattern as
`prisma/seed.ts` — and is called after **every** variant create/update/delete, after saving a
`hasVariants` product, after a manual variant stock adjustment, and after a cancellation
restock. It no-ops for non-variant products where the column is authoritative.

## 5. Categories — `src/app/[locale]/admin/(dashboard)/categories/**`

Tree-ordered list (parents followed by descendants, indented by depth), inline active toggle,
sibling reordering, delete. Form: parent select, bilingual name/description/SEO, thumbnail and
banner upload, `isActive`, `sortOrder`. Separate panel to assign/remove products.

- Parent select **excludes the category's own descendants**, and `saveCategory` re-checks for a
  cycle server-side by walking the parent chain.
- Reordering **rewrites the whole sibling run to 0..n-1**: every seeded category shares
  `sortOrder: 0`, so a naive swap would be a no-op. This was found by reading the seed data.
- Deleting a category with children is **refused** rather than orphaning them.
- Categories whose parent was soft-deleted are appended rather than silently vanishing.

## 6. Inventory — `src/app/[locale]/admin/(dashboard)/inventory/**`

Stock table merging simple products and variants (there is no single table to paginate, so the
merged list is sliced in memory — the catalogue is small). All / low / out views, search, inline
adjustment form, and a product-filterable transaction history.

Every adjustment writes the stock change **and** an `InventoryTransaction`
(`MANUAL_ADJUSTMENT`, signed `quantityChange`, `resultingQuantity`, **mandatory** `note`,
`createdByAdminId` from the guard's returned id) inside one database transaction — stock can
never move without a record of who moved it and why. The update is a **compare-and-swap**
(`where: { id, stockQuantity: <value just read> }`), the same style as
`src/lib/orders/create-order.ts`, so a concurrent sale is never silently overwritten. Adjusting
a variant re-syncs the parent aggregate. Adjusting a `hasVariants` product directly is refused —
that column is derived.

## 7. Orders — `src/app/[locale]/admin/(dashboard)/orders/**`

List with search (order number, guest email/phone, customer name/email), status filter, date
range, four sorts, pagination. Detail: items, subtotal/discount/coupon/shipping/tax/total,
payment block, guest-or-registered customer, shipping address, status-history timeline, internal
note.

**Status change** updates `Order.status` and appends an `OrderStatusHistory` row stamped with
`changedByAdminId`.

**Cancellation restock** fires only when moving to `CANCELLED` from
`PENDING | PAYMENT_PENDING | PAID | PROCESSING` — once shipped, goods have physically left, so
that is a `RETURN`, recorded separately. Per item it checks for an existing `CANCELLATION`
`InventoryTransaction` before restoring; the `@@unique([orderItemId, type])` constraint is the
real guarantee, since a racing insert fails and rolls the whole transaction back rather than
leaving stock inflated. The success message reports what **actually** moved, not what was
attempted.

**Mark as paid** confirms a `PENDING` `manual` payment (`Payment.status → SUCCEEDED`) and moves
the order to `PAID` only if it is still awaiting payment; an order already being picked or
shipped keeps its status. This is the intended flow for a provider with no callback by design.

## 8. Customers — `src/app/[locale]/admin/(dashboard)/customers/**`

List with search, order count and total spend. Detail: spend/orders/joined stats, order history,
addresses, wishlist. Viewing needs `customers.view`; the enable/disable action requires the
stronger `customers.manage` (confirmed `customer-authorize.ts` rejects `isActive: false`, so
disabling really does block sign-in).

---

## Deviations from the brief

1. **Storefront chrome suppression.** `src/app/[locale]/admin/**` is nested inside the
   storefront's `[locale]/layout.tsx`, which owns `<html>`/`<body>` and renders
   `SiteHeader`/`SiteFooter`. A nested layout cannot remove a parent's chrome, and the
   structural fix (moving storefront routes into a route group) is out of scope and
   conflict-prone. `src/components/admin/admin-chrome-reset.tsx` therefore emits a stylesheet,
   present only while an admin route is mounted, that hides them via `body:has([data-admin-root])`.
   Documented in the file. If the storefront is later split into a route group, delete it.

2. **`(dashboard)` route group.** The brief asked for `admin/layout.tsx`, but the login page must
   not get the sidebar and a layout at `admin/` would wrap it. Guarded pages live under
   `admin/(dashboard)/` instead; URLs are unchanged.

3. **Login `callbackUrl`.** As the brief anticipated, the middleware adds no callback param, so
   login redirects to `/admin`. No callback plumbing was added.

4. **Unit tests under `tests/lib/admin/`** — slightly outside the stated file scope, but a new
   directory with zero conflict risk, and they caught a real bug (below).

5. **No schema change.** The existing schema covered everything; nothing was added or renamed.

6. `revalidatePath("/", "layout")` after catalogue writes rather than enumerating storefront
   route patterns, which would rot as the storefront grows. Reasoning is in
   `src/lib/admin/revalidate.ts`.

---

## Bugs found and fixed during the work

- **Dashboard nav matched every `/admin/*` path.** `/admin` prefixes every admin route, so the
  Dashboard item highlighted on any page without its own nav entry. Caught by
  `tests/lib/admin/nav.test.ts`. Nav items now support an exact-match flag.
- **Stale status dropdown.** After a status change, the order panel's local select kept its
  mount-time value. Fixed with React's documented adjust-state-during-render pattern, which —
  unlike remounting via `key` (tried first) — leaves the success message on screen.
- **500 on `/en/admin` in production builds only.** See below.

### The production-only 500

A production build registered `/en/admin` and `/fa/admin` for **static generation**: the
storefront layout supplies `generateStaticParams` and the dashboard page reads no
`searchParams`. A per-admin dashboard must never be statically generated or cached. Declaring
`dynamic = "force-dynamic"` on the *layout* was not enough — the route stayed in the prerender
manifest and then threw `DYNAMIC_SERVER_USAGE` at request time, a hard 500 that **never appears
in dev mode**. The page-level export is what removes it from the build-time static list.

Before (broken):
```
prerendered routes: ["/robots.txt","/_not-found","/sitemap.xml","/en/admin","/fa/admin"]
[Error: Dynamic server usage: Page with `dynamic = "force-dynamic"` won't be rendered statically.]
  digest: 'DYNAMIC_SERVER_USAGE'
```
After:
```
prerendered routes: ["/robots.txt","/_not-found","/sitemap.xml"]
anon /en/admin -> 307
login page -> 200
```
and an authenticated request to `/en/admin` on `next start` rendered the live dashboard.

This is the main reason I recommend running `next build` in CI, not just `tsc` — dev mode hides
this entire class of bug.

---

## Verification

### Automated

```
$ npx tsc --noEmit
(no output — clean)

$ npx vitest run
 Test Files  21 passed (21)
      Tests  135 passed (135)

$ npx eslint src/lib/admin src/components/admin "src/app/[locale]/admin" tests/lib/admin
(no output — clean)

$ npx next build
 ✓ Compiled successfully in 9.5s
```

`npm run lint` (whole repo) reports **2 problems that are not mine**, both in files committed by
the parallel storefront workstream and in paths I am scoped out of:

```
src/app/[locale]/product/[slug]/page.tsx
  78:8  warning  Unused eslint-disable directive (no problems were reported from 'react/no-danger')

tests/lib/orders/create-order.test.ts
  1:20  error  'beforeEach' is defined but never used  @typescript-eslint/no-unused-vars

✖ 2 problems (1 error, 1 warning)
```

`git log -1 --` on those paths shows `25c1409 Add product detail page and search page` and
`de6244a Add checkout, orders, and coupon validation…` — the storefront workstream. I did not
touch them (`src/lib/orders/**` and the storefront routes are explicitly off-limits). **Whoever
owns those files needs a one-line fix each before `npm run lint` is green.**

### Live (logged in as `owner@mahcandle.test` / `AdminPass123!`)

All of the following are things I actually did and observed, not expected behaviour.

**Login + dashboard.** Visiting `/en/admin/products` while anonymous redirected to
`/en/admin/login`, which rendered with no storefront chrome. After signing in, the dashboard
showed real seeded numbers: 24 published products, 7 customers, 1 order, 4 low stock, 1 out of
stock, 0 total sales (correct — the only order was `PENDING`, which my sales definition excludes).

**Created a product through the admin UI** ("Amber Dusk Test", `MAH-TEST-999`, 425 000, stock
12, Published, Autumn category) and it redirected to its edit page:

```
     nameEn      |    nameFa    |     sku      |  status   | stockQuantity |     slugEn      | pub | stamped
-----------------+--------------+--------------+-----------+---------------+-----------------+-----+---------
 Amber Dusk Test | غروب کهربایی | MAH-TEST-999 | PUBLISHED |            12 | amber-dusk-test | t   | t
```

**It appeared on the live storefront:**
```
$ curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/en/product/amber-dusk-test
200
$ curl -s http://localhost:3100/en/product/amber-dusk-test | grep -o "Amber Dusk Test\|425,000\|MAH-TEST-999" | sort -u
425,000
Amber Dusk Test
MAH-TEST-999
```

**Image upload** wrote both the file and the row, auto-marked primary as the first image:
```
                                url                                 | isPrimary | sortOrder
--------------------------------------------------------------------+-----------+-----------
 /uploads/products/cmu9gprno.../e45890f2-edee-4a5c-a136-9e1f5aeae7fc.png | t     |         0

-rw-r--r-- 1 Lenovo 197121 70 Sep 20 10:51 e45890f2-edee-4a5c-a136-9e1f5aeae7fc.png
```

**Variant + stock sync.** Enabled `hasVariants`, added one variant with stock 9 —
`Product.stockQuantity` was re-derived from 12 to 9:
```
     sku      | hasVariants | product_agg |   variant_sku   | variant_stock | price
--------------+-------------+-------------+-----------------+---------------+--------
 MAH-TEST-999 | t           |           9 | MAH-TEST-999-SM |             9 | 325000
```

**Inventory adjustment** (+10 on `MAH-VET-014-LARGE`, note "Restock from supplier delivery
#4471") moved the variant 4→14, re-synced the parent aggregate 12→22, and wrote the audit row:
```
        sku         | variant_stock | product_stock
--------------------+---------------+---------------
 MAH-VET-014-LARGE  |            14 |            22
 MAH-VET-014-MEDIUM |             4 |            22
 MAH-VET-014-SMALL  |             4 |            22

       type        | quantityChange | resultingQuantity |                 note                 |    admin
-------------------+----------------+-------------------+--------------------------------------+-------------
 MANUAL_ADJUSTMENT |             10 |                14 | Restock from supplier delivery #4471 | Store Owner
```

**Order: mark as paid.** Clicked "Mark as paid" on `MAH-MU9FEELO-K4FI` → "Payment confirmed.":
```
 order_status | payment_status
--------------+----------------
 PAID         | SUCCEEDED
```

**Order: cancel + restock.** Changed status to `CANCELLED` with a note. Variant stock went 7→8,
aggregate stayed consistent (24 = variant sum 24), and one `CANCELLATION` row was written:
```
     type     | quantityChange | resultingQuantity |               note                |    name
--------------+----------------+-------------------+-----------------------------------+-------------
 CANCELLATION |              1 |                 8 | Cancelled order MAH-MU9FEELO-K4FI | Store Owner
```

**Cancel idempotency (the important one).** Moved the order to `PROCESSING`, then back to
`CANCELLED`. Stock did **not** double-restore:
```
=== stock must still be 8, not 9 ===
        sku        | stockQuantity
-------------------+---------------
 MAH-AMB-001-SMALL |             8

=== CANCELLATION rows must still be exactly 1 ===
 cancellation_rows
-------------------
                 1
```
Full history recorded: `PENDING → PAID → CANCELLED → PROCESSING → CANCELLED`.

**Soft delete.** Deleted the test product from the admin list; it became `ARCHIVED` +
`deletedAt`, and the storefront page went to 404:
```
     sku      |  status  | soft_deleted      product_page=404
--------------+----------+--------------
 MAH-TEST-999 | ARCHIVED | t
```

**Permission enforcement (live negative test).** Created a temporary admin on the seeded
`order_manager` role (`orders.manage, customers.view, customers.manage`) and signed in as them:

- Nav rendered only Dashboard / Orders / Customers — no Products, Categories or Inventory:
  `["/en/admin","/en/admin/orders","/en/admin/customers", …]`
- Navigating directly to `/en/admin/products` redirected to `/en/admin`.
- The dashboard's "View all" link to inventory was correctly absent.

That temporary admin has been deleted.

**Persian RTL.** `/fa/admin` renders mirrored (sidebar on the right), with genuine Persian
labels, Persian digits and **Jalali dates**: «داشبورد», «موجودی‌هایی که نیاز به رسیدگی دارند»,
`۳۱۴٬۶۰۰`, `۲۹ شهریور ۱۴۰۵`. `en.json` and `fa.json` carry identical key sets (verified
programmatically, 541 keys each).

---

## Concerns

1. **Two `npm run lint` failures belong to the parallel storefront workstream**
   (`src/app/[locale]/product/[slug]/page.tsx`, `tests/lib/orders/create-order.test.ts`). I left
   them alone deliberately — both are in paths the brief puts off-limits to me. `npm run lint` is
   not green until their owner fixes them.

2. **I disrupted the shared dev server and restored it.** This worktree is shared with another
   agent working concurrently (their commit `33c2371` landed between mine). My `next build` runs
   overwrote the `.next` directory their `next dev` on port 3000 was using, and it began
   returning 500s. I removed `.next`, restarted a clean `next dev -p 3000`, and confirmed it
   healthy (`/en` 200, `/en/candles` 200, `/en/admin/login` 200, `/en/admin` 307). **If anyone
   was mid-task on port 3000, that restart is the cause.** Production builds and dev servers
   should not share a checkout.

3. **Deactivating an admin does not revoke their live session.** `admin-auth.ts` uses the JWT
   strategy with no per-request database check, so an `AdminUser` set to `isActive: false` (or
   deleted outright — I hit this with my temporary test admin) keeps working until the token
   expires. Same applies to a role's permissions changing mid-session. This is pre-existing in
   `src/lib/auth/admin-auth.ts`, which is outside my scope, but it is a real security gap worth
   a follow-up: re-read the admin's `isActive` and permissions in the `session` callback.

4. **Order `MAH-MU9FEELO-K4FI` is now `CANCELLED`** in the dev database, with the seeded
   variant's stock restored. That is the residue of the live verification above and the data is
   internally consistent (history complete, one `CANCELLATION` row). Re-seed if a `PENDING`
   order is wanted.

5. **Bulk "publish" stamps `publishedAt` in a second pass.** `updateMany` cannot set a per-row
   value, so publishing sets the status for all selected ids and then stamps `publishedAt` for
   those still null. Two statements, not one transaction — a crash between them would leave a
   published product with no `publishedAt`. Low impact (the storefront filters on `status`), but
   worth knowing.

6. **The chrome-reset stylesheet is a workaround, not a design.** It depends on the storefront
   layout keeping `header`/`footer` as direct children of a single wrapper div. If that markup
   changes, the storefront header will reappear above the admin panel. The durable fix is a
   `(storefront)` route group.

7. **In-memory slicing** in the inventory list and category tree is correct for a 24-product
   catalogue and will need real SQL pagination at a few thousand SKUs.

8. **Not covered** (not in scope, no code written): coupons, reviews moderation, CMS/homepage
   sections, blog, media library, settings, email templates, notifications, and admin-user
   management itself — all have schema support and no admin UI yet.
