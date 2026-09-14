import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("renders children and applies the primary variant by default", () => {
    render(<Button>Add to cart</Button>);
    const button = screen.getByRole("button", { name: "Add to cart" });
    expect(button.className).toContain("bg-amber");
  });

  it("applies the secondary variant classes when requested", () => {
    render(<Button variant="secondary">Wishlist</Button>);
    const button = screen.getByRole("button", { name: "Wishlist" });
    expect(button.className).toContain("border-espresso");
  });

  it("applies the requested size classes", () => {
    render(<Button size="lg">Buy now</Button>);
    const button = screen.getByRole("button", { name: "Buy now" });
    expect(button.className).toContain("h-13");
  });
});
