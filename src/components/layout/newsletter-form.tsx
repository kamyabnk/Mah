"use client";

import { useActionState } from "react";
import { subscribeToNewsletter } from "@/lib/newsletter/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function NewsletterForm({ placeholder, cta }: { placeholder: string; cta: string }) {
  const [state, formAction, isPending] = useActionState(subscribeToNewsletter, { ok: false });

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input type="email" name="email" placeholder={placeholder} required className="max-w-52" />
        <Button type="submit" size="sm" disabled={isPending}>
          {cta}
        </Button>
      </div>
      {state.ok && <span className="text-xs text-sage">✓</span>}
    </form>
  );
}
