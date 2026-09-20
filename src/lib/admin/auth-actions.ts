"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { adminSignIn, adminSignOut } from "@/lib/auth/admin-auth";
import type { AdminFormState } from "./action-result";

const loginSchema = z.object({
  email: z.string().trim().min(1).email(),
  password: z.string().min(1),
});

function adminPath(locale: string, path: string): string {
  return `/${locale === "fa" ? "fa" : "en"}${path}`;
}

export async function loginAdmin(
  _prevState: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const locale = String(formData.get("locale") ?? "en");

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "invalidForm" };
  }

  try {
    await adminSignIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch {
    // `authorizeAdmin` returns null for unknown emails, wrong passwords and
    // deactivated accounts alike; the message stays deliberately generic so the
    // form never reveals which admin emails exist.
    return { error: "invalidCredentials" };
  }

  // Outside the try/catch on purpose: `redirect()` signals by throwing.
  redirect(adminPath(locale, "/admin"));
}

export async function logoutAdmin(formData: FormData): Promise<void> {
  const locale = String(formData.get("locale") ?? "en");
  await adminSignOut({ redirect: false });
  redirect(adminPath(locale, "/admin/login"));
}
