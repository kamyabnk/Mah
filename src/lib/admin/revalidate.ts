import { revalidatePath } from "next/cache";

/**
 * Catalog writes in the admin panel can affect almost any storefront route:
 * listing pages, category pages, search, the homepage sections and every
 * product detail page (a category rename changes breadcrumbs across the site).
 * Enumerating those route patterns here would silently rot as the storefront
 * grows, so admin mutations purge the whole tree instead. Admin writes are rare
 * and human-paced, so the extra regeneration is a fair price for not serving
 * stale catalogue data.
 */
export function revalidateStorefront(): void {
  revalidatePath("/", "layout");
}
