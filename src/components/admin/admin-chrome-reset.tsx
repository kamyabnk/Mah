/**
 * The admin panel lives under `src/app/[locale]/admin/**`, which Next.js nests
 * inside the storefront's `[locale]/layout.tsx`. That parent layout owns the
 * `<html>`/`<body>` elements and renders `SiteHeader`/`SiteFooter`, and a nested
 * layout cannot remove a parent's chrome. Splitting the storefront into a route
 * group would fix it structurally but means moving storefront route files, which
 * is out of scope for this workstream.
 *
 * So the admin subtree suppresses the storefront chrome with a stylesheet that
 * only exists while an admin route is mounted, keyed off the `data-admin-root`
 * marker this component's sibling shell renders.
 */
export function AdminChromeReset() {
  return (
    <style>{`
      body:has([data-admin-root]) > div > header,
      body:has([data-admin-root]) > div > footer { display: none !important; }
      body:has([data-admin-root]) > div > main { display: flex; flex-direction: column; }
      body:has([data-admin-root]) { background-color: var(--color-ivory-dark); }
    `}</style>
  );
}
