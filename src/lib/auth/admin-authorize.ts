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
