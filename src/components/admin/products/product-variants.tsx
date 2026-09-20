"use client";

import { useActionState, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Alert, Panel, PanelHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  deleteProductVariant,
  saveProductVariant,
} from "@/lib/admin/products/variant-actions";
import type { AdminFormState } from "@/lib/admin/action-result";

export interface ProductVariantRow {
  id: string;
  sku: string;
  nameEn: string;
  nameFa: string;
  size: string | null;
  color: string | null;
  fragrance: string | null;
  price: number | null;
  salePrice: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  isActive: boolean;
}

const initialState: AdminFormState = {};

export function ProductVariants({
  productId,
  hasVariants,
  variants,
}: {
  productId: string;
  hasVariants: boolean;
  variants: ProductVariantRow[];
}) {
  const t = useTranslations("admin.products.variants");
  const [showNew, setShowNew] = useState(false);

  if (!hasVariants) {
    return (
      <Panel>
        <PanelHeader title={t("title")} />
        <p className="px-5 py-8 text-center text-sm text-espresso-light">{t("enableFirst")}</p>
      </Panel>
    );
  }

  return (
    <Panel>
      <PanelHeader
        title={t("title")}
        actions={
          <Button type="button" size="sm" variant="secondary" onClick={() => setShowNew(true)}>
            {t("add")}
          </Button>
        }
      />

      {variants.length === 0 && !showNew && (
        <p className="px-5 py-8 text-center text-sm text-espresso-light">{t("empty")}</p>
      )}

      <ul className="divide-y divide-espresso/5">
        {variants.map((variant) => (
          <li key={variant.id} className="p-5">
            <VariantForm productId={productId} variant={variant} />
          </li>
        ))}
        {showNew && (
          <li className="bg-ivory-dark/30 p-5">
            <VariantForm
              productId={productId}
              variant={null}
              onDone={() => setShowNew(false)}
            />
          </li>
        )}
      </ul>
    </Panel>
  );
}

function VariantForm({
  productId,
  variant,
  onDone,
}: {
  productId: string;
  variant: ProductVariantRow | null;
  onDone?: () => void;
}) {
  const t = useTranslations("admin.products.variants");
  const tCommon = useTranslations("admin.common");
  const tField = useTranslations("admin.fieldErrors");
  const tErrors = useTranslations("admin.products.errors");
  const router = useRouter();
  const [isDeleting, startDelete] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [state, formAction, isPending] = useActionState(
    async (prev: AdminFormState, formData: FormData) => {
      const result = await saveProductVariant(prev, formData);
      if (result.success) {
        router.refresh();
        onDone?.();
      }
      return result;
    },
    initialState
  );

  const fieldError = (name: string) => {
    const code = state.fieldErrors?.[name];
    if (!code) return undefined;
    if (tField.has(code)) return tField(code);
    if (tErrors.has(code)) return tErrors(code);
    return code;
  };

  const inputClasses =
    "h-9 w-full rounded-sm border border-espresso/20 bg-ivory px-2 text-sm text-espresso";

  const cell = (
    label: string,
    name: string,
    defaultValue: string,
    extra: React.InputHTMLAttributes<HTMLInputElement> = {}
  ) => (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-espresso-light">{label}</span>
      <input name={name} defaultValue={defaultValue} className={inputClasses} {...extra} />
      {fieldError(name) && <span className="text-xs text-terracotta">{fieldError(name)}</span>}
    </label>
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="productId" value={productId} />
      {variant && <input type="hidden" name="variantId" value={variant.id} />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cell(t("sku"), "sku", variant?.sku ?? "", { required: true, dir: "ltr" })}
        {cell(t("nameEn"), "nameEn", variant?.nameEn ?? "", { required: true })}
        {cell(t("nameFa"), "nameFa", variant?.nameFa ?? "", { required: true, dir: "rtl" })}
        {cell(t("size"), "size", variant?.size ?? "")}
        {cell(t("color"), "color", variant?.color ?? "")}
        {cell(t("fragrance"), "fragrance", variant?.fragrance ?? "")}
        {cell(t("price"), "price", variant?.price !== null && variant ? String(variant.price) : "", {
          type: "number",
          min: 0,
          step: 1,
          dir: "ltr",
        })}
        {cell(
          t("salePrice"),
          "salePrice",
          variant?.salePrice !== null && variant ? String(variant.salePrice) : "",
          { type: "number", min: 0, step: 1, dir: "ltr" }
        )}
        {cell(t("stockQuantity"), "stockQuantity", String(variant?.stockQuantity ?? 0), {
          type: "number",
          min: 0,
          step: 1,
          dir: "ltr",
        })}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-espresso">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={variant?.isActive ?? true}
            className="size-4 accent-[var(--color-amber)]"
          />
          {t("isActive")}
        </label>

        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? tCommon("saving") : tCommon("save")}
        </Button>

        {variant ? (
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => {
              if (!window.confirm(tCommon("deleteConfirm"))) return;
              setDeleteError(null);
              startDelete(async () => {
                const result = await deleteProductVariant(variant.id);
                if (!result.ok) {
                  setDeleteError(
                    result.error === "UNAUTHORIZED"
                      ? tCommon("unauthorized")
                      : tCommon("unexpectedError")
                  );
                  return;
                }
                router.refresh();
              });
            }}
            className="text-xs text-terracotta underline disabled:opacity-40"
          >
            {tCommon("delete")}
          </button>
        ) : (
          <button
            type="button"
            onClick={onDone}
            className="text-xs text-espresso-light underline"
          >
            {tCommon("cancel")}
          </button>
        )}
      </div>

      {state.error && state.error !== "invalidForm" && (
        <Alert tone="error">
          {state.error === "unauthorized"
            ? tCommon("unauthorized")
            : tErrors.has(state.error)
              ? tErrors(state.error)
              : tCommon("unexpectedError")}
        </Alert>
      )}
      {deleteError && <Alert tone="error">{deleteError}</Alert>}
    </form>
  );
}
