"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Alert, FormSection } from "@/components/admin/ui";
import {
  CheckboxField,
  Field,
  SelectField,
  TextAreaField,
  TextField,
} from "@/components/admin/fields";
import { Button } from "@/components/ui/button";
import { saveCategory } from "@/lib/admin/categories/actions";
import type { AdminFormState } from "@/lib/admin/action-result";
import type { AdminCategoryDetail } from "@/lib/admin/categories/queries";
import { localised, type AdminLocale } from "@/lib/admin/format";

const initialState: AdminFormState = {};

export function CategoryForm({
  locale,
  category,
  parentOptions,
}: {
  locale: AdminLocale;
  category: AdminCategoryDetail | null;
  parentOptions: { id: string; nameEn: string; nameFa: string }[];
}) {
  const t = useTranslations("admin.categories");
  const tCommon = useTranslations("admin.common");
  const tField = useTranslations("admin.fieldErrors");
  const tErrors = useTranslations("admin.categories.errors");
  const tImages = useTranslations("admin.products.images");

  const [state, formAction, isPending] = useActionState(saveCategory, initialState);

  const fieldError = (name: string) => {
    const code = state.fieldErrors?.[name];
    if (!code) return undefined;
    if (tField.has(code)) return tField(code);
    if (tErrors.has(code)) return tErrors(code);
    return code;
  };

  const formError = () => {
    if (!state.error) return undefined;
    if (state.error === "unauthorized") return tCommon("unauthorized");
    if (state.error === "invalidType") return tImages("invalidType");
    if (state.error === "tooLarge") return tImages("tooLarge");
    if (tErrors.has(state.error)) return tErrors(state.error);
    return tCommon("unexpectedError");
  };

  const fileInputClasses =
    "text-sm text-espresso file:me-3 file:rounded-sm file:border-0 file:bg-espresso file:px-3 file:py-2 file:text-sm file:text-ivory";

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      {category && <input type="hidden" name="id" value={category.id} />}
      <input type="hidden" name="currentImage" value={category?.image ?? ""} />
      <input type="hidden" name="currentBanner" value={category?.banner ?? ""} />

      {state.success && <Alert>{t("saved")}</Alert>}
      {formError() && <Alert tone="error">{formError()}</Alert>}

      <FormSection title={t("sections.basics")}>
        <TextField
          name="nameEn"
          label={t("fields.nameEn")}
          defaultValue={category?.nameEn ?? ""}
          error={fieldError("nameEn")}
          required
        />
        <TextField
          name="nameFa"
          label={t("fields.nameFa")}
          defaultValue={category?.nameFa ?? ""}
          error={fieldError("nameFa")}
          dir="rtl"
          required
        />
        <TextField
          name="slugEn"
          label={t("fields.slugEn")}
          defaultValue={category?.slugEn ?? ""}
          error={fieldError("slugEn")}
          dir="ltr"
          required
        />
        <TextField
          name="slugFa"
          label={t("fields.slugFa")}
          defaultValue={category?.slugFa ?? ""}
          error={fieldError("slugFa")}
          dir="rtl"
          required
        />
        <SelectField
          name="parentId"
          label={t("fields.parent")}
          defaultValue={category?.parentId ?? ""}
          error={fieldError("parentId")}
        >
          <option value="">{tCommon("none")}</option>
          {parentOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {localised(locale, option.nameEn, option.nameFa)}
            </option>
          ))}
        </SelectField>
        <TextField
          type="number"
          name="sortOrder"
          label={t("fields.sortOrder")}
          defaultValue={String(category?.sortOrder ?? 0)}
          error={fieldError("sortOrder")}
          min={0}
          step={1}
          dir="ltr"
        />
        <TextAreaField
          name="descriptionEn"
          label={t("fields.descriptionEn")}
          defaultValue={category?.descriptionEn ?? ""}
          rows={3}
        />
        <TextAreaField
          name="descriptionFa"
          label={t("fields.descriptionFa")}
          defaultValue={category?.descriptionFa ?? ""}
          rows={3}
          dir="rtl"
        />
        <Field label=" ">
          <CheckboxField
            name="isActive"
            label={t("fields.isActive")}
            defaultChecked={category?.isActive ?? true}
          />
        </Field>
      </FormSection>

      <FormSection title={t("sections.media")}>
        <Field label={t("fields.image")}>
          {category?.image && (
            <Image
              src={category.image}
              alt=""
              width={120}
              height={80}
              className="mb-2 h-20 w-30 rounded-sm object-cover"
            />
          )}
          <input
            type="file"
            name="imageFile"
            accept="image/jpeg,image/png,image/webp"
            className={fileInputClasses}
          />
        </Field>
        <Field label={t("fields.banner")}>
          {category?.banner && (
            <Image
              src={category.banner}
              alt=""
              width={240}
              height={80}
              className="mb-2 h-20 w-60 rounded-sm object-cover"
            />
          )}
          <input
            type="file"
            name="bannerFile"
            accept="image/jpeg,image/png,image/webp"
            className={fileInputClasses}
          />
        </Field>
      </FormSection>

      <FormSection title={t("sections.seo")}>
        <TextField
          name="seoTitleEn"
          label={t("fields.seoTitleEn")}
          defaultValue={category?.seoTitleEn ?? ""}
        />
        <TextField
          name="seoTitleFa"
          label={t("fields.seoTitleFa")}
          defaultValue={category?.seoTitleFa ?? ""}
          dir="rtl"
        />
        <TextAreaField
          name="seoDescriptionEn"
          label={t("fields.seoDescriptionEn")}
          defaultValue={category?.seoDescriptionEn ?? ""}
          rows={2}
        />
        <TextAreaField
          name="seoDescriptionFa"
          label={t("fields.seoDescriptionFa")}
          defaultValue={category?.seoDescriptionFa ?? ""}
          rows={2}
          dir="rtl"
        />
      </FormSection>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? tCommon("saving") : tCommon("save")}
        </Button>
        <Link href="/admin/categories" className="text-sm text-espresso-light underline">
          {tCommon("cancel")}
        </Link>
      </div>
    </form>
  );
}
