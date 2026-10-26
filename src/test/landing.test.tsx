import { fireEvent, render, screen } from "@testing-library/react";
import type { AnchorHTMLAttributes, ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Index } from "@/routes/index";
import { useSimulation } from "@/store/simulationStore";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...props
    }: AnchorHTMLAttributes<HTMLAnchorElement> & { to: string; children: ReactNode }) => (
      <a href={to} {...props}>
        {children}
      </a>
    ),
  };
});

afterEach(() => useSimulation.getState().reset());

describe("landing digital twin", () => {
  it("presents recruiter CTAs and the live micro-twin", async () => {
    render(<Index />);

    expect(
      await screen.findByRole("heading", { name: /Real-Time Urban Flood Early-Warning/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Launch SCADA Control Room/i })).toHaveAttribute(
      "href",
      "/admin",
    );
    expect(screen.getByRole("link", { name: /Explore System Architecture/i })).toHaveAttribute(
      "href",
      "/architecture",
    );
    expect(screen.getByText("Live micro-twin")).toBeInTheDocument();
  });

  it("scenario shortcuts update the shared simulation store", async () => {
    render(<Index />);
    fireEvent.click(await screen.findByRole("button", { name: /Simulate heavy rain/i }));
    expect(useSimulation.getState().stormOverride).toBe(true);
    expect(useSimulation.getState().netInflow).toBe(16);

    fireEvent.click(screen.getByRole("button", { name: /Clear drain/i }));
    expect(useSimulation.getState().stormOverride).toBe(false);
    expect(useSimulation.getState().trueLevel).toBe(12);
  });
});
