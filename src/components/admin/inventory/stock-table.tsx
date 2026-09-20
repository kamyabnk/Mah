"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Alert, EmptyState, Pill, Table, TableWrap, Td, Th } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { adjustStock } from "@/lib/admin/inventory/actions";
import type { AdminFormState } from "@/lib/admin/action-result";
import type { StockItem } from "@/lib/admin/inventory/queries";
import { formatNumber, localised, type AdminLocale } from "@/lib/admin/format";

const initialState: AdminFormState = {};

export function StockTable({ items, locale }: { items: StockItem[]; locale: AdminLocale }) {
  const t = useTranslations("admin.inventory");
  const tCommon = useTranslations("admin.common");
  const [openKey, setOpenKey] = useState<string | null>(null);

  if (items.length === 0) return <EmptyState>{t("noItems")}</EmptyState>;

  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            <Th>{t("columnItem")}</Th>
            <Th>{t("columnSku")}</Th>
            <Th>{t("columnStock")}</Th>
            <Th>{t("columnThreshold")}</Th>
            <Th>{t("columnState")}</Th>
            <Th>{tCommon("actions")}</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const key = `${item.kind}-${item.id}`;
            const state =
              item.stockQuantity === 0
                ? "out"
                : item.stockQuantity <= item.lowStockThreshold
                  ? "low"
                  : "ok";

            return (
              <tr key={key} className="align-top">
                <Td>
                  <Link
                    href={`/admin/products/${item.productId}`}
                    className="font-medium text-amber underline"
                  >
                    {localised(locale, item.nameEn, item.nameFa)}
                  </Link>
                  {item.kind === "variant" && (
                    <span className="block text-xs text-espresso-light">
                      {t("variantOf", {
                        product: localised(locale, item.productNameEn, item.productNameFa),
                      })}
                    </span>
                  )}
                  {openKey === key && (
                    <AdjustForm item={item} locale={locale} onDone={() => setOpenKey(null)} />
                  )}
                </Td>
                <Td className="whitespace-nowrap text-xs text-espresso-light">{item.sku}</Td>
                <Td className="tabular-nums">{formatNumber(item.stockQuantity, locale)}</Td>
                <Td className="tabular-nums text-xs text-espresso-light">
                  {formatNumber(item.lowStockThreshold, locale)}
                </Td>
                <Td>
                  <Pill
                    tone={state === "out" ? "danger" : state === "low" ? "warning" : "positive"}
                  >
                    {state === "out" ? t("stateOut") : state === "low" ? t("stateLow") : t("stateOk")}
                  </Pill>
                </Td>
                <Td>
                  <button
                    type="button"
                    onClick={() => setOpenKey(openKey === key ? null : key)}
                    className="text-xs text-amber underline"
                  >
                    {t("adjust")}
                  </button>
                </Td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </TableWrap>
  );
}

function AdjustForm({
  item,
  locale,
  onDone,
}: {
  item: StockItem;
  locale: AdminLocale;
  onDone: () => void;
}) {
  const t = useTranslations("admin.inventory");
  const tErrors = useTranslations("admin.inventory.errors");
  const tField = useTranslations("admin.fieldErrors");
  const tCommon = useTranslations("admin.common");
  const router = useRouter();

  const [state, formAction, isPending] = useActionState(
    async (prev: AdminFormState, formData: FormData) => {
      const result = await adjustStock(prev, formData);
      if (result.success) {
        router.refresh();
        onDone();
      }
      return result;
    },
    initialState
  );

  const message = () => {
    if (!state.error) return undefined;
    if (state.error === "unauthorized") return tCommon("unauthorized");
    if (tErrors.has(state.error)) return tErrors(state.error);
    if (state.error === "invalidForm") {
      const code = state.fieldErrors?.note ?? state.fieldErrors?.quantityChange;
      if (code === "required") return t("noteRequired");
      if (code && tField.has(code)) return tField(code);
      return tCommon("unexpectedError");
    }
    return tCommon("unexpectedError");
  };

  const inputClasses =
    "h-9 w-full rounded-sm border border-espresso/20 bg-ivory px-2 text-sm text-espresso";

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-2 rounded-sm bg-ivory-dark/60 p-3">
      <input type="hidden" name="kind" value={item.kind} />
      <input type="hidden" name="id" value={item.id} />

      <p className="text-xs text-espresso-light">
        {t("currentStock")}: {formatNumber(item.stockQuantity, locale)}
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-espresso-light">{t("change")}</span>
        <input
          type="number"
          name="quantityChange"
          step={1}
          dir="ltr"
          required
          className={`${inputClasses} max-w-32`}
        />
        <span className="text-xs text-espresso-light">{t("changeHint")}</span>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-espresso-light">
          {tCommon("note")} ({tCommon("required")})
        </span>
        <input type="text" name="note" required className={inputClasses} />
      </label>

      {message() && <Alert tone="error">{message()}</Alert>}

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? tCommon("saving") : t("adjust")}
        </Button>
        <button type="button" onClick={onDone} className="text-xs text-espresso-light underline">
          {tCommon("cancel")}
        </button>
      </div>
    </form>
  );
}
