import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AboutPage } from "@/routes/about";

describe("AboutPage", () => {
  it("credits the capstone team and renders six expandable interview defenses", () => {
    render(<AboutPage />);

    expect(screen.getByText(/Team 10 · RNSIT, Bengaluru/)).toBeInTheDocument();
    const questions = screen.getAllByText(/Q[1-6] · Design reasoning/);
    expect(questions).toHaveLength(6);
    const firstAnswer = questions[0].closest("details");
    expect(firstAnswer).not.toHaveAttribute("open");
    fireEvent.click(within(firstAnswer as HTMLElement).getByText(/Why split the sensor/));
    expect(firstAnswer).toHaveAttribute("open");
  });
});
