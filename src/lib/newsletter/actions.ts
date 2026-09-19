"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";

const emailSchema = z.string().trim().toLowerCase().email();

export async function subscribeToNewsletter(
  _prevState: { ok: boolean; error?: string },
  formData: FormData
): Promise<{ ok: boolean; error?: string }> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, error: "INVALID_EMAIL" };

  await prisma.newsletterSubscriber.upsert({
    where: { email: parsed.data },
    create: { email: parsed.data },
    update: {},
  });

  return { ok: true };
}
