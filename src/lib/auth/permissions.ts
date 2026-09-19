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

export interface AdminSessionLike {
  user?: { id: string; permissions?: string[] } | null;
}

/**
 * Server-side gate for every admin Server Action/route handler. Never trust client-side role
 * state — this must be called at the top of each action, reading the real session each time.
 */
export function requireAdminPermission(session: AdminSessionLike | null, required: string): string {
  if (!session?.user?.id) {
    throw new AdminPermissionError(required);
  }
  requirePermission(session.user.permissions, required);
  return session.user.id;
}
