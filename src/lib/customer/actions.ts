"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { customerSignIn, customerSignOut } from "@/lib/auth/customer-auth";
import { CART_COOKIE_NAME } from "@/lib/cart/read";
import { mergeGuestCartIntoCustomer } from "@/lib/cart/merge-on-login";
import { loginSchema, registerSchema } from "./validation";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
}

async function mergeCartAfterAuth(email: string): Promise<void> {
  const cookieStore = await cookies();
  const guestToken = cookieStore.get(CART_COOKIE_NAME)?.value ?? null;
  const customer = await prisma.customer.findUnique({ where: { email }, select: { id: true } });
  if (!customer) return;
  await mergeGuestCartIntoCustomer(customer.id, guestToken);
  if (guestToken) cookieStore.delete(CART_COOKIE_NAME);
}

export async function registerCustomer(
  _prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string") fieldErrors[key] = issue.message;
    }
    return { fieldErrors };
  }

  const { firstName, lastName, email, phone, password } = parsed.data;

  const existing = await prisma.customer.findUnique({ where: { email } });
  if (existing) {
    return { fieldErrors: { email: "An account with this email already exists" } };
  }

  const passwordHash = await hashPassword(password);
  await prisma.customer.create({
    data: { firstName, lastName, email, phone, passwordHash },
  });

  await mergeCartAfterAuth(email);

  const callbackUrl = (formData.get("callbackUrl") as string | null) || "/";
  await customerSignIn("credentials", { email, password, redirect: false });
  redirect(callbackUrl);
}

export async function loginCustomer(_prevState: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password" };
  }

  const { email, password } = parsed.data;

  try {
    await customerSignIn("credentials", { email, password, redirect: false });
  } catch {
    return { error: "Invalid email or password" };
  }

  await mergeCartAfterAuth(email);

  const callbackUrl = (formData.get("callbackUrl") as string | null) || "/";
  redirect(callbackUrl);
}

export async function logoutCustomer(): Promise<void> {
  await customerSignOut({ redirect: false });
  redirect("/");
}
