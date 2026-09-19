import type { CSSProperties, ReactNode } from "react";
import { Fraunces, Inter, Vazirmatn } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const vazirmatn = Vazirmatn({ subsets: ["arabic"], variable: "--font-vazirmatn", display: "swap" });

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("title"), description: t("description") };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  const messages = await getMessages();
  const activeLocale = locale === "fa" ? "fa" : "en";
  const isRtl = locale === "fa";
  const fontClassNames = isRtl ? vazirmatn.variable : `${inter.variable} ${fraunces.variable}`;
  const fontVars = isRtl
    ? { "--font-sans": "var(--font-vazirmatn)", "--font-display": "var(--font-vazirmatn)" }
    : { "--font-sans": "var(--font-inter)", "--font-display": "var(--font-fraunces)" };

  return (
    <html lang={locale} dir={isRtl ? "rtl" : "ltr"}>
      <body className={`${fontClassNames} antialiased`} style={fontVars as CSSProperties}>
        <NextIntlClientProvider messages={messages}>
          <div className="flex min-h-screen flex-col">
            <SiteHeader locale={activeLocale} />
            <main className="flex-1">{children}</main>
            <SiteFooter locale={activeLocale} />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
