"use server";

import { autocompleteProducts, type AutocompleteSuggestion } from "./search-products";

export async function getAutocompleteSuggestions(
  locale: "en" | "fa",
  query: string
): Promise<AutocompleteSuggestion[]> {
  return autocompleteProducts(locale, query);
}
