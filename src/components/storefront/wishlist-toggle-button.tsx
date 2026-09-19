"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleWishlist } from "@/lib/wishlist/actions";
import { cn } from "@/lib/cn";

interface WishlistToggleButtonProps {
  productId: string;
  initialWishlisted: boolean;
  loginHref: string;
  className?: string;
}

export function WishlistToggleButton({
  productId,
  initialWishlisted,
  loginHref,
  className,
}: WishlistToggleButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [wishlisted, setWishlisted] = useOptimistic(initialWishlisted);

  return (
    <button
      type="button"
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={wishlisted}
      disabled={isPending}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-full border border-espresso/15 bg-ivory/90 text-lg transition-colors",
        wishlisted ? "text-terracotta" : "text-espresso/60 hover:text-terracotta",
        className
      )}
      onClick={() => {
        startTransition(async () => {
          const next = !wishlisted;
          setWishlisted(next);
          const result = await toggleWishlist(productId);
          if (!result.ok) {
            setWishlisted(!next);
            if (result.error === "UNAUTHENTICATED") router.push(loginHref);
          }
        });
      }}
    >
      {wishlisted ? "♥" : "♡"}
    </button>
  );
}
