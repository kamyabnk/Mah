"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Alert, FormSection } from "@/components/admin/ui";
import {
  CheckboxField,
  CheckboxGroup,
  Field,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { saveProduct } from "@/lib/admin/products/actions";
import type { AdminFormState } from "@/lib/admin/action-result";
import type { AdminProductDetail, ProductFormOptions } from "@/lib/admin/products/queries";
import { localised, type AdminLocale } from "@/lib/admin/format";

const initialState: AdminFormState = {};

const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export function ProductForm({
  locale,
  product,
  options,
}: {
  locale: AdminLocale;
  product: AdminProductDetail | null;
  options: ProductFormOptions;
}) {
  const t = useTranslations("admin.products");
  const tCommon = useTranslations("admin.common");
  const tStatus = useTranslations("admin.productStatus");
  const tField = useTranslations("admin.fieldErrors");
  const tErrors = useTranslations("admin.products.errors");

  const [state, formAction, isPending] = useActionState(saveProduct, initialState);
  // Mirrors the checkbox so the stock field can switch to its read-only,
  // variant-managed presentation without a round trip.
  const [hasVariants, setHasVariants] = useState(product?.hasVariants ?? false);

  const fieldError = (name: string): string | undefined => {
    const code = state.fieldErrors?.[name];
    if (!code) return undefined;
    if (tField.has(code)) return tField(code);
    if (tErrors.has(code)) return tErrors(code);
    return code;
  };

  const formError = (): string | undefined => {
    if (!state.error) return undefined;
    if (state.error === "unauthorized") return tCommon("unauthorized");
    if (state.error === "invalidForm") return tCommon("unexpectedError");
    if (tErrors.has(state.error)) return tErrors(state.error);
    return tCommon("unexpectedError");
  };

  const categoryOptions = options.categories.map((category) => ({
    value: category.id,
    label: localised(locale, category.nameEn, category.nameFa),
  }));
  const tagOptions = options.tags.map((tag) => ({
    value: tag.id,
    label: localised(locale, tag.nameEn, tag.nameFa),
  }));

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {product && <input type="hidden" name="id" value={product.id} />}

      {state.success && <Alert>{t("saved")}</Alert>}
      {formError() && <Alert tone="error">{formError()}</Alert>}

      <FormSection title={t("sections.basics")}>
        <TextField
          name="nameEn"
          label={t("fields.nameEn")}
          defaultValue={product?.nameEn ?? ""}
          error={fieldError("nameEn")}
          required
        />
        <TextField
          name="nameFa"
          label={t("fields.nameFa")}
          defaultValue={product?.nameFa ?? ""}
          error={fieldError("nameFa")}
          dir="rtl"
          required
        />
        <TextField
          name="slugEn"
          label={t("fields.slugEn")}
          defaultValue={product?.slugEn ?? ""}
          error={fieldError("slugEn")}
          hint={t("hints.slug")}
          dir="ltr"
          required
        />
        <TextField
          name="slugFa"
          label={t("fields.slugFa")}
          defaultValue={product?.slugFa ?? ""}
          error={fieldError("slugFa")}
          dir="rtl"
          required
        />
        <TextField
          name="sku"
          label={t("fields.sku")}
          defaultValue={product?.sku ?? ""}
          error={fieldError("sku")}
          dir="ltr"
          required
        />
        <SelectField
          name="status"
          label={t("fields.status")}
          defaultValue={product?.status ?? "DRAFT"}
        >
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {tStatus(value)}
            </option>
          ))}
        </SelectField>
      </FormSection>

      <FormSection title={t("sections.content")}>
        <TextAreaField
          name="shortDescriptionEn"
          label={t("fields.shortDescriptionEn")}
          defaultValue={product?.shortDescriptionEn ?? ""}
          rows={2}
        />
        <TextAreaField
          name="shortDescriptionFa"
          label={t("fields.shortDescriptionFa")}
          defaultValue={product?.shortDescriptionFa ?? ""}
          rows={2}
          dir="rtl"
        />
        <TextAreaField
          name="descriptionEn"
          label={t("fields.descriptionEn")}
          defaultValue={product?.descriptionEn ?? ""}
          rows={6}
        />
        <TextAreaField
          name="descriptionFa"
          label={t("fields.descriptionFa")}
          defaultValue={product?.descriptionFa ?? ""}
          rows={6}
          dir="rtl"
        />
      </FormSection>

      <FormSection title={t("sections.pricing")}>
        <TextField
          type="number"
          name="price"
          label={t("fields.price")}
          defaultValue={product ? String(product.price) : ""}
          error={fieldError("price")}
          min={0}
          step={1}
          dir="ltr"
          required
        />
        <TextField
          type="number"
          name="salePrice"
          label={t("fields.salePrice")}
          defaultValue={product?.salePrice !== null && product ? String(product.salePrice) : ""}
          error={fieldError("salePrice")}
          min={0}
          step={1}
          dir="ltr"
        />
        <TextField
          type="number"
          name="costPrice"
          label={t("fields.costPrice")}
          defaultValue={product?.costPrice !== null && product ? String(product.costPrice) : ""}
          error={fieldError("costPrice")}
          min={0}
          step={1}
          dir="ltr"
        />
        <TextField
          type="number"
          name="lowStockThreshold"
          label={t("fields.lowStockThreshold")}
          defaultValue={String(product?.lowStockThreshold ?? 5)}
          error={fieldError("lowStockThreshold")}
          min={0}
          step={1}
          dir="ltr"
        />
        <TextField
          type="number"
          name="stockQuantity"
          label={t("fields.stockQuantity")}
          defaultValue={String(product?.stockQuantity ?? 0)}
          error={fieldError("stockQuantity")}
          min={0}
          step={1}
          dir="ltr"
          disabled={hasVariants}
          hint={hasVariants ? t("hints.variantStock") : undefined}
        />
        <Field label=" " className="justify-end">
          <CheckboxField
            name="hasVariants"
            label={t("fields.hasVariants")}
            checked={hasVariants}
            onChange={(event) => setHasVariants(event.target.checked)}
          />
        </Field>
      </FormSection>

      <FormSection title={t("sections.candle")}>
        <TextField
          name="waxType"
          label={t("fields.waxType")}
          defaultValue={product?.waxType ?? ""}
        />
        <TextField
          name="wickType"
          label={t("fields.wickType")}
          defaultValue={product?.wickType ?? ""}
        />
        <TextField
          type="number"
          name="burnTimeMinutes"
          label={t("fields.burnTimeMinutes")}
          defaultValue={product?.burnTimeMinutes !== null && product ? String(product.burnTimeMinutes) : ""}
          error={fieldError("burnTimeMinutes")}
          min={0}
          step={1}
          dir="ltr"
        />
        <TextField
          type="number"
          name="weight"
          label={t("fields.weight")}
          defaultValue={product?.weight !== null && product ? String(product.weight) : ""}
          error={fieldError("weight")}
          min={0}
          step="0.01"
          dir="ltr"
        />
        <SelectField
          name="fragranceFamilyId"
          label={t("fields.fragranceFamily")}
          defaultValue={product?.fragranceFamilyId ?? ""}
        >
          <option value="">{tCommon("none")}</option>
          {options.fragranceFamilies.map((family) => (
            <option key={family.id} value={family.id}>
              {localised(locale, family.nameEn, family.nameFa)}
            </option>
          ))}
        </SelectField>
        <Field label={t("fields.dimensions")}>
          <div className="grid grid-cols-3 gap-2">
            {(["Length", "Width", "Height"] as const).map((axis) => (
              <input
                key={axis}
                type="number"
                name={`dimension${axis}`}
                min={0}
                step="0.1"
                dir="ltr"
                aria-label={axis}
                defaultValue={
                  product?.parsedDimensions[axis.toLowerCase() as "length" | "width" | "height"] ??
                  ""
                }
                className="h-10 w-full rounded-sm border border-espresso/20 bg-ivory px-2 text-sm text-espresso"
              />
            ))}
          </div>
        </Field>
        <TextField name="color" label={t("fields.color")} defaultValue={product?.color ?? ""} />
        <TextField name="size" label={t("fields.size")} defaultValue={product?.size ?? ""} />
        <TextAreaField
          name="fragranceNotesEn"
          label={t("fields.fragranceNotesEn")}
          defaultValue={product?.fragranceNotesEn ?? ""}
          rows={2}
        />
        <TextAreaField
          name="fragranceNotesFa"
          label={t("fields.fragranceNotesFa")}
          defaultValue={product?.fragranceNotesFa ?? ""}
          rows={2}
          dir="rtl"
        />
      </FormSection>

      <FormSection title={t("sections.care")}>
        <TextAreaField
          name="ingredientsEn"
          label={t("fields.ingredientsEn")}
          defaultValue={product?.ingredientsEn ?? ""}
          rows={3}
        />
        <TextAreaField
          name="ingredientsFa"
          label={t("fields.ingredientsFa")}
          defaultValue={product?.ingredientsFa ?? ""}
          rows={3}
          dir="rtl"
        />
        <TextAreaField
          name="careInstructionsEn"
          label={t("fields.careInstructionsEn")}
          defaultValue={product?.careInstructionsEn ?? ""}
          rows={3}
        />
        <TextAreaField
          name="careInstructionsFa"
          label={t("fields.careInstructionsFa")}
          defaultValue={product?.careInstructionsFa ?? ""}
          rows={3}
          dir="rtl"
        />
        <TextAreaField
          name="safetyInstructionsEn"
          label={t("fields.safetyInstructionsEn")}
          defaultValue={product?.safetyInstructionsEn ?? ""}
          rows={3}
        />
        <TextAreaField
          name="safetyInstructionsFa"
          label={t("fields.safetyInstructionsFa")}
          defaultValue={product?.safetyInstructionsFa ?? ""}
          rows={3}
          dir="rtl"
        />
      </FormSection>

      <FormSection title={t("sections.organisation")}>
        <CheckboxGroup
          label={t("fields.categories")}
          name="categoryIds"
          options={categoryOptions}
          selected={product?.categoryIds ?? []}
          emptyLabel={tCommon("none")}
        />
        <CheckboxGroup
          label={t("fields.tags")}
          name="tagIds"
          options={tagOptions}
          selected={product?.tagIds ?? []}
          emptyLabel={tCommon("none")}
        />
        <Field label=" " className="sm:col-span-2">
          <div className="flex flex-wrap gap-6">
            <CheckboxField
              name="isFeatured"
              label={t("fields.isFeatured")}
              defaultChecked={product?.isFeatured ?? false}
            />
            <CheckboxField
              name="isBestSeller"
              label={t("fields.isBestSeller")}
              defaultChecked={product?.isBestSeller ?? false}
            />
            <CheckboxField
              name="isNewArrival"
              label={t("fields.isNewArrival")}
              defaultChecked={product?.isNewArrival ?? false}
            />
          </div>
        </Field>
      </FormSection>

      <FormSection title={t("sections.seo")}>
        <TextField
          name="seoTitleEn"
          label={t("fields.seoTitleEn")}
          defaultValue={product?.seoTitleEn ?? ""}
        />
        <TextField
          name="seoTitleFa"
          label={t("fields.seoTitleFa")}
          defaultValue={product?.seoTitleFa ?? ""}
          dir="rtl"
        />
        <TextAreaField
          name="seoDescriptionEn"
          label={t("fields.seoDescriptionEn")}
          defaultValue={product?.seoDescriptionEn ?? ""}
          rows={2}
        />
        <TextAreaField
          name="seoDescriptionFa"
          label={t("fields.seoDescriptionFa")}
          defaultValue={product?.seoDescriptionFa ?? ""}
          rows={2}
          dir="rtl"
        />
        <TextField
          name="seoKeywordsEn"
          label={t("fields.seoKeywordsEn")}
          defaultValue={product?.seoKeywordsEn ?? ""}
        />
        <TextField
          name="seoKeywordsFa"
          label={t("fields.seoKeywordsFa")}
          defaultValue={product?.seoKeywordsFa ?? ""}
          dir="rtl"
        />
      </FormSection>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? tCommon("saving") : tCommon("save")}
        </Button>
        <Link href="/admin/products" className="text-sm text-espresso-light underline">
          {tCommon("cancel")}
        </Link>
      </div>
    </form>
  );
}
