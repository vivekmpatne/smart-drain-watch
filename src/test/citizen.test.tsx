import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CitizenPortal } from "../routes/citizen";

describe("CitizenPortal", () => {
  it("shows live simulation guidance and clearly labels the forecast as simulated", () => {
    render(<CitizenPortal />);

    expect(screen.getByRole("heading", { name: "Flood Safety Portal" })).toBeInTheDocument();
    expect(screen.getByText("SAFE RISK")).toBeInTheDocument();
    expect(screen.getByText(/no live API connection/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /illustration of drain at/i })).toBeInTheDocument();
  });

  it("opens and submits a local drainage report simulation", () => {
    render(<CitizenPortal />);
    fireEvent.click(screen.getByRole("button", { name: /report a drainage issue/i }));

    expect(screen.getByRole("dialog", { name: /report drainage issue/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /submit simulated report/i }));

    expect(screen.getByRole("heading", { name: "Report received" })).toBeInTheDocument();
    expect(screen.getByText(/no report was sent to BBMP/i)).toBeInTheDocument();
  });
});
