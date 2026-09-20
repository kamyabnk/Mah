"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useRouter } from "@/i18n/navigation";
import { Alert, Panel, PanelHeader, Pill } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  deleteProductImage,
  moveProductImage,
  setPrimaryProductImage,
  updateProductImageAlt,
  uploadProductImage,
} from "@/lib/admin/products/image-actions";
import type { AdminFormState } from "@/lib/admin/action-result";

export interface ProductImageRow {
  id: string;
  url: string;
  altEn: string | null;
  altFa: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

const initialState: AdminFormState = {};

export function ProductImages({
  productId,
  images,
}: {
  productId: string;
  images: ProductImageRow[];
}) {
  const t = useTranslations("admin.products.images");
  const tCommon = useTranslations("admin.common");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, isUploading] = useActionState(
    async (prev: AdminFormState, formData: FormData) => {
      const result = await uploadProductImage(prev, formData);
      if (result.success) {
        formRef.current?.reset();
        router.refresh();
      }
      return result;
    },
    initialState
  );

  const errorMessage = () => {
    if (!state.error) return null;
    if (state.error === "invalidType") return t("invalidType");
    if (state.error === "tooLarge") return t("tooLarge");
    if (state.error === "unauthorized") return tCommon("unauthorized");
    return tCommon("unexpectedError");
  };

  return (
    <Panel>
      <PanelHeader title={t("title")} />

      <form ref={formRef} action={formAction} className="flex flex-col gap-3 border-b border-espresso/10 p-5">
        <input type="hidden" name="productId" value={productId} />
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-56 flex-1 flex-col gap-1.5">
            <span className="text-sm font-medium text-espresso">{t("upload")}</span>
            <input
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="text-sm text-espresso file:me-3 file:rounded-sm file:border-0 file:bg-espresso file:px-3 file:py-2 file:text-sm file:text-ivory"
            />
          </label>
          <Button type="submit" size="sm" disabled={isUploading}>
            {isUploading ? t("uploading") : t("upload")}
          </Button>
        </div>
        {errorMessage() && <Alert tone="error">{errorMessage()}</Alert>}
      </form>

      {images.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-espresso-light">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-espresso/5">
          {images.map((image, index) => (
            <ImageRow
              key={image.id}
              image={image}
              isFirst={index === 0}
              isLast={index === images.length - 1}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function ImageRow({
  image,
  isFirst,
  isLast,
}: {
  image: ProductImageRow;
  isFirst: boolean;
  isLast: boolean;
}) {
  const t = useTranslations("admin.products.images");
  const tCommon = useTranslations("admin.common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [altEn, setAltEn] = useState(image.altEn ?? "");
  const [altFa, setAltFa] = useState(image.altFa ?? "");
  const [error, setError] = useState<string | null>(null);

  const run = (operation: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await operation();
      if (!result.ok) {
        setError(result.error === "UNAUTHORIZED" ? tCommon("unauthorized") : tCommon("unexpectedError"));
        return;
      }
      router.refresh();
    });
  };

  const inputClasses =
    "h-9 w-full rounded-sm border border-espresso/20 bg-ivory px-2 text-sm text-espresso";
  const actionClasses = "text-xs underline disabled:opacity-40";

  return (
    <li className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start">
      <Image
        src={image.url}
        alt={image.altEn ?? ""}
        width={96}
        height={96}
        className="size-24 shrink-0 rounded-sm object-cover"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {image.isPrimary && <Pill tone="positive">{t("primary")}</Pill>}
          <span className="text-xs text-espresso-light">#{image.sortOrder + 1}</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={altEn}
            onChange={(event) => setAltEn(event.target.value)}
            placeholder={t("altEn")}
            aria-label={t("altEn")}
            className={inputClasses}
          />
          <input
            value={altFa}
            onChange={(event) => setAltFa(event.target.value)}
            placeholder={t("altFa")}
            aria-label={t("altFa")}
            dir="rtl"
            className={inputClasses}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={isPending}
            onClick={() => run(() => updateProductImageAlt(image.id, altEn, altFa))}
            className={`${actionClasses} text-amber`}
          >
            {tCommon("save")}
          </button>
          {!image.isPrimary && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(() => setPrimaryProductImage(image.id))}
              className={`${actionClasses} text-espresso`}
            >
              {t("setPrimary")}
            </button>
          )}
          <button
            type="button"
            disabled={isPending || isFirst}
            onClick={() => run(() => moveProductImage(image.id, "up"))}
            className={`${actionClasses} text-espresso-light`}
          >
            {t("moveUp")}
          </button>
          <button
            type="button"
            disabled={isPending || isLast}
            onClick={() => run(() => moveProductImage(image.id, "down"))}
            className={`${actionClasses} text-espresso-light`}
          >
            {t("moveDown")}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              if (window.confirm(tCommon("deleteConfirm"))) run(() => deleteProductImage(image.id));
            }}
            className={`${actionClasses} text-terracotta`}
          >
            {t("delete")}
          </button>
        </div>

        {error && <p className="text-xs text-terracotta">{error}</p>}
      </div>
    </li>
  );
}
