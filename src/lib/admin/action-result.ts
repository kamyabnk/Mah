import type { z } from "zod";
import { adminAuth } from "@/lib/auth/admin-auth";
import { AdminPermissionError, requireAdminPermission } from "@/lib/auth/permissions";

/** Shape consumed by `useActionState` in every admin form. */
export interface AdminFormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
  /** Set by create actions so the client can react to a freshly created row. */
  createdId?: string;
}

export type AdminActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

/**
 * The single enforcement point for admin mutations. Reads the real session from
 * the server on every call — a client-supplied role is never consulted — and
 * throws `AdminPermissionError` when the permission is missing.
 *
 * Returns the acting admin's id so callers can stamp audit columns
 * (`createdByAdminId`, `changedByAdminId`, `updatedByAdminId`).
 */
export async function guardAdminAction(permission: string): Promise<string> {
  const session = await adminAuth();
  return requireAdminPermission(session, permission);
}

/**
 * Form-action flavour of `guardAdminAction`: returns the acting admin's id, or
 * `null` when the permission is missing so the caller can render the refusal in
 * the form instead of throwing a 500 at the user.
 */
export async function tryGuardAdminAction(permission: string): Promise<string | null> {
  try {
    return await guardAdminAction(permission);
  } catch (error) {
    if (error instanceof AdminPermissionError) return null;
    throw error;
  }
}

/**
 * Runs `fn` behind `guardAdminAction` and normalises failures into a result
 * object. `fn` must never call `redirect()` — Next.js implements redirects by
 * throwing, and that control-flow signal must not be swallowed here. Redirect
 * from the caller after inspecting the result instead.
 */
export async function runAdminAction<T>(
  permission: string,
  fn: (adminId: string) => Promise<T>
): Promise<AdminActionResult<T>> {
  let adminId: string;
  try {
    adminId = await guardAdminAction(permission);
  } catch (error) {
    if (error instanceof AdminPermissionError) return { ok: false, error: "UNAUTHORIZED" };
    throw error;
  }

  try {
    return { ok: true, data: await fn(adminId) };
  } catch (error) {
    if (error instanceof AdminActionError) return { ok: false, error: error.code };
    throw error;
  }
}

/** Throw from inside a `runAdminAction` callback to surface a translatable code. */
export class AdminActionError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = "AdminActionError";
  }
}

/** Flattens a Zod issue list into the `fieldErrors` map the forms render. */
export function toFieldErrors(error: z.ZodError): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}
