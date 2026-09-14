import { verifyPassword } from "./password";

export interface CustomerRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  isActive: boolean;
}

export interface AuthorizedCustomer {
  id: string;
  email: string;
  name: string;
}

export async function authorizeCustomer(
  credentials: Partial<Record<"email" | "password", unknown>>,
  findCustomerByEmail: (email: string) => Promise<CustomerRecord | null>
): Promise<AuthorizedCustomer | null> {
  const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : null;
  const password = typeof credentials?.password === "string" ? credentials.password : null;
  if (!email || !password) return null;

  const customer = await findCustomerByEmail(email);
  if (!customer || !customer.isActive) return null;

  const valid = await verifyPassword(password, customer.passwordHash);
  if (!valid) return null;

  return { id: customer.id, email: customer.email, name: `${customer.firstName} ${customer.lastName}`.trim() };
}
