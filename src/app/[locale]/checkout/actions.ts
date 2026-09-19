"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { z } from "zod";
import { customerAuth } from "@/lib/auth/customer-auth";
import { resolveCartId, CART_COOKIE_NAME } from "@/lib/cart/read";
import { createOrder } from "@/lib/orders/create-order";

const checkoutSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: z.string().trim().min(5),
  email: z.string().trim().email().optional().or(z.literal("")),
  addressLine: z.string().trim().min(1),
  city: z.string().trim().min(1),
  province: z.string().trim().min(1),
  postalCode: z.string().trim().min(1),
  country: z.string().trim().min(1),
  couponCode: z.string().trim().optional(),
  customerNote: z.string().trim().optional(),
});

export interface CheckoutFormState {
  error?: string;
}

export async function submitCheckout(_prevState: CheckoutFormState, formData: FormData): Promise<CheckoutFormState> {
  const parsed = checkoutSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    addressLine: formData.get("addressLine"),
    city: formData.get("city"),
    province: formData.get("province"),
    postalCode: formData.get("postalCode"),
    country: formData.get("country"),
    couponCode: formData.get("couponCode") || undefined,
    customerNote: formData.get("customerNote") || undefined,
  });

  if (!parsed.success) {
    return { error: "INVALID_FORM" };
  }

  const session = await customerAuth();
  const customerId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const cartId = await resolveCartId();

  if (!cartId) {
    return { error: "EMPTY_CART" };
  }

  const data = parsed.data;
  const result = await createOrder({
    cartId,
    customerId,
    guestEmail: customerId ? null : data.email || null,
    guestPhone: customerId ? null : data.phone,
    shippingAddress: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      addressLine: data.addressLine,
      city: data.city,
      province: data.province,
      postalCode: data.postalCode,
      country: data.country,
    },
    couponCode: data.couponCode || null,
    customerNote: data.customerNote || null,
  });

  if (!result.ok) {
    return { error: result.error };
  }

  if (!customerId) {
    (await cookies()).delete(CART_COOKIE_NAME);
  }

  redirect(`/checkout/confirmation/${result.orderNumber}`);
}
