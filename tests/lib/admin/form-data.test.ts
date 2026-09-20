import { describe, expect, it } from "vitest";
import {
  normaliseSlug,
  readBoolean,
  readInt,
  readNumber,
  readRequiredString,
  readString,
  readStringList,
} from "@/lib/admin/form-data";

function form(entries: [string, string][]): FormData {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

describe("readString", () => {
  it("trims the value", () => {
    expect(readString(form([["name", "  Amber  "]]), "name")).toBe("Amber");
  });

  it("returns null for a blank value so nullable columns stay null", () => {
    expect(readString(form([["name", "   "]]), "name")).toBeNull();
  });

  it("returns null when the field is absent", () => {
    expect(readString(form([]), "name")).toBeNull();
  });
});

describe("readRequiredString", () => {
  it("returns an empty string rather than null when absent", () => {
    expect(readRequiredString(form([]), "name")).toBe("");
  });
});

describe("readNumber", () => {
  it("parses a numeric string", () => {
    expect(readNumber(form([["price", "425000"]]), "price")).toBe(425000);
  });

  it("returns null for a blank field", () => {
    expect(readNumber(form([["price", ""]]), "price")).toBeNull();
  });

  it("returns null for a non-numeric value", () => {
    expect(readNumber(form([["price", "abc"]]), "price")).toBeNull();
  });
});

describe("readInt", () => {
  it("truncates a fractional value", () => {
    expect(readInt(form([["qty", "7.9"]]), "qty")).toBe(7);
  });

  it("falls back when the field is missing", () => {
    expect(readInt(form([]), "qty", 5)).toBe(5);
  });

  it("keeps negative values, which stock adjustments rely on", () => {
    expect(readInt(form([["change", "-3"]]), "change")).toBe(-3);
  });
});

describe("readBoolean", () => {
  it("is true when a checkbox is present at any value", () => {
    expect(readBoolean(form([["isActive", "on"]]), "isActive")).toBe(true);
  });

  it("is false when the checkbox is absent, as unchecked boxes are", () => {
    expect(readBoolean(form([]), "isActive")).toBe(false);
  });
});

describe("readStringList", () => {
  it("collects every value for a repeated field", () => {
    expect(readStringList(form([["ids", "a"], ["ids", "b"]]), "ids")).toEqual(["a", "b"]);
  });

  it("drops blank entries", () => {
    expect(readStringList(form([["ids", "a"], ["ids", "  "]]), "ids")).toEqual(["a"]);
  });

  it("returns an empty array when nothing was selected", () => {
    expect(readStringList(form([]), "ids")).toEqual([]);
  });
});

describe("normaliseSlug", () => {
  it("lowercases and hyphenates spaces", () => {
    expect(normaliseSlug("  Amber Dusk  ")).toBe("amber-dusk");
  });

  it("collapses repeated separators", () => {
    expect(normaliseSlug("amber__  dusk")).toBe("amber-dusk");
  });

  it("strips leading and trailing hyphens", () => {
    expect(normaliseSlug("-amber-dusk-")).toBe("amber-dusk");
  });

  it("preserves Persian characters", () => {
    expect(normaliseSlug("غروب کهربایی")).toBe("غروب-کهربایی");
  });
});
