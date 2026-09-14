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
