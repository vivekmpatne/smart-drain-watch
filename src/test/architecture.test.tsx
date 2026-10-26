import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArchitecturePage } from "@/routes/architecture";

describe("ArchitecturePage", () => {
  it("shows the selected pipeline node contract and updates adaptive thresholds", () => {
    render(<ArchitecturePage />);

    fireEvent.click(screen.getByRole("button", { name: /EMA smoother/i }));
    expect(screen.getByText("Logic contract").parentElement).toHaveTextContent(/α = 0.3/);

    fireEvent.change(screen.getByRole("slider", { name: "Weather score" }), {
      target: { value: "6" },
    });
    expect(screen.getByText("70")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });
});
