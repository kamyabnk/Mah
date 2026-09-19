import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuantityStepper } from "@/components/storefront/quantity-stepper";

describe("QuantityStepper", () => {
  it("renders the current value", () => {
    render(<QuantityStepper value={3} max={10} onChange={() => {}} />);
    expect(screen.getByDisplayValue("3")).toBeTruthy();
  });

  it("calls onChange with value + 1 when the increment button is clicked", async () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={3} max={10} onChange={onChange} />);
    screen.getByRole("button", { name: /increase/i }).click();
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("calls onChange with value - 1 when the decrement button is clicked", async () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={3} max={10} onChange={onChange} />);
    screen.getByRole("button", { name: /decrease/i }).click();
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("disables the increment button at max", () => {
    render(<QuantityStepper value={10} max={10} onChange={() => {}} />);
    const button = screen.getByRole("button", { name: /increase/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("disables the decrement button at 1", () => {
    render(<QuantityStepper value={1} max={10} onChange={() => {}} />);
    const button = screen.getByRole("button", { name: /decrease/i }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
