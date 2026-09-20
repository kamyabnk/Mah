import { redirect } from "@/i18n/navigation";
import { adminAuth } from "@/lib/auth/admin-auth";
import { hasPermission } from "@/lib/auth/permissions";

export interface AdminSession {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
}

/**
 * Reads the real admin session from the server. Returns null when there is none —
 * callers decide whether to redirect (layout/pages) or throw (Server Actions).
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const session = await adminAuth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    name: session.user.name ?? "",
    role: session.user.role ?? "",
    permissions: session.user.permissions ?? [],
  };
}

/**
 * Page/layout guard. Defence in depth: the middleware already bounces anonymous
 * visitors, but every admin page re-checks the session server-side rather than
 * trusting that the request reached it through the middleware at all.
 */
export async function requireAdminPage(locale: string): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) {
    redirect({ href: "/admin/login", locale });
  }
  return session as AdminSession;
}

/**
 * Page-level permission guard. Used by pages that read sensitive data; the
 * authoritative check for mutations is always `requireAdminPermission` inside
 * the Server Action itself.
 */
export async function requireAdminPagePermission(
  locale: string,
  required: string
): Promise<AdminSession> {
  const session = await requireAdminPage(locale);
  if (!hasPermission(session.permissions, required)) {
    redirect({ href: "/admin", locale });
  }
  return session;
}
