import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { pickDate, type DateRange } from "@/domain/dates";
import { RangeCalendar } from "./range-calendar";

const today = "2026-11-10";

function Harness({
  initial = { checkIn: null, checkOut: null },
  layout = "desktop",
}: {
  initial?: DateRange;
  layout?: "desktop" | "phone";
}) {
  const [range, setRange] = useState<DateRange>(initial);
  return (
    <RangeCalendar
      today={today}
      range={range}
      onPick={(date) => setRange((r) => pickDate(r, date))}
      layout={layout}
    />
  );
}

const day = (name: string) => screen.getByRole("button", { name });

// The phone layout renders 12 months; scoping to one keeps queries fast.
const dayIn = (month: string, name: string) =>
  within(screen.getByRole("grid", { name: month })).getByRole("button", { name });

function press(key: string) {
  fireEvent.keyDown(document.activeElement as HTMLElement, { key });
}

describe("RangeCalendar on desktop", () => {
  it("shows two months as labelled grids with Monday-first headers", () => {
    render(<Harness />);

    expect(screen.getByRole("grid", { name: "November 2026" })).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "December 2026" })).toBeInTheDocument();
    const headers = screen.getAllByRole("columnheader");
    expect(headers[0]).toHaveTextContent("Mo");
    expect(headers[0]).toHaveAttribute("abbr", "Monday");
  });

  it("disables Previous on the current month and moves with Next", () => {
    render(<Harness />);
    const prev = screen.getByRole("button", { name: "Previous month" });
    expect(prev).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(prev);
    expect(screen.getByRole("grid", { name: "November 2026" })).toBeInTheDocument();

    const next = screen.getByRole("button", { name: "Next month" });
    next.focus();
    fireEvent.click(next);
    expect(screen.getByRole("grid", { name: "December 2026" })).toBeInTheDocument();
    expect(screen.getByRole("grid", { name: "January 2027" })).toBeInTheDocument();
    expect(next).toHaveFocus();
    expect(prev).not.toHaveAttribute("aria-disabled");
  });

  it("marks today and makes it the day in the Tab order", () => {
    render(<Harness />);
    const todayButton = day("Tuesday 10 November 2026, today");
    expect(todayButton).toHaveAttribute("tabindex", "0");
    expect(day("Wednesday 11 November 2026")).toHaveAttribute("tabindex", "-1");
  });

  it("picks a range by click and shows the footer", () => {
    render(<Harness />);

    fireEvent.click(day("Friday 13 November 2026"));
    fireEvent.click(day("Sunday 15 November 2026"));

    expect(screen.getByText("2 nights · Fri 13 Nov – Sun 15 Nov")).toBeInTheDocument();
    for (const name of [
      "Friday 13 November 2026, check-in",
      "Saturday 14 November 2026, in your stay",
      "Sunday 15 November 2026, check-out",
    ]) {
      expect(day(name).closest("td")).toHaveAttribute("aria-selected", "true");
    }
    expect(day("Monday 16 November 2026").closest("td")).not.toHaveAttribute("aria-selected");
  });

  it("picks a range by keyboard", () => {
    render(<Harness />);
    day("Tuesday 10 November 2026, today").focus();

    press("ArrowRight");
    press("ArrowRight");
    press("ArrowRight");
    expect(day("Friday 13 November 2026")).toHaveFocus();
    press("Enter");
    press("ArrowRight");
    press("ArrowRight");
    press(" ");

    expect(screen.getByText("2 nights · Fri 13 Nov – Sun 15 Nov")).toBeInTheDocument();
    expect(day("Sunday 15 November 2026, check-out")).toHaveFocus();
  });

  it("moves focus by week, month and week edges, across month boundaries", () => {
    render(<Harness />);
    day("Tuesday 10 November 2026, today").focus();

    press("End");
    expect(day("Sunday 15 November 2026")).toHaveFocus();
    press("Home");
    expect(day("Monday 9 November 2026, unavailable")).toHaveFocus();
    press("ArrowDown");
    press("ArrowDown");
    press("ArrowDown");
    expect(day("Monday 30 November 2026")).toHaveFocus();
    press("ArrowRight");
    expect(day("Tuesday 1 December 2026")).toHaveFocus();
    expect(day("Tuesday 1 December 2026")).toHaveAttribute("tabindex", "0");

    press("PageDown");
    expect(screen.getByRole("grid", { name: "January 2027" })).toBeInTheDocument();
    expect(day("Friday 1 January 2027")).toHaveFocus();
    press("ArrowUp");
    expect(day("Friday 25 December 2026")).toHaveFocus();
    press("PageUp");
    press("PageUp");
    // Focus never goes before today's month.
    expect(screen.queryByRole("grid", { name: "October 2026" })).not.toBeInTheDocument();
    expect(day("Sunday 1 November 2026, unavailable")).toHaveFocus();
  });

  it("restarts the selection on a pick on or before check-in", () => {
    render(<Harness />);
    fireEvent.click(day("Sunday 15 November 2026"));
    fireEvent.click(day("Thursday 12 November 2026"));

    expect(day("Thursday 12 November 2026, check-in")).toBeInTheDocument();
    expect(day("Sunday 15 November 2026")).toBeInTheDocument();
    expect(screen.getByText("Thu 12 Nov · Select check-out")).toBeInTheDocument();
  });

  it("restarts the selection by keyboard", () => {
    render(<Harness />);
    day("Tuesday 10 November 2026, today").focus();
    press("End");
    press("Enter");
    expect(day("Sunday 15 November 2026, check-in")).toHaveFocus();

    press("ArrowLeft");
    press("ArrowLeft");
    press("ArrowLeft");
    press("Enter");

    expect(day("Thursday 12 November 2026, check-in")).toHaveFocus();
    expect(day("Sunday 15 November 2026")).toBeInTheDocument();
    expect(screen.getByText("Thu 12 Nov · Select check-out")).toBeInTheDocument();
  });

  it("does nothing when a past day is activated by keyboard", () => {
    render(<Harness />);
    day("Tuesday 10 November 2026, today").focus();
    press("ArrowLeft");
    const past = day("Monday 9 November 2026, unavailable");
    expect(past).toHaveFocus();

    press("Enter");
    press(" ");

    expect(past).toHaveFocus();
    expect(screen.getByText("Select check-in")).toBeInTheDocument();
  });

  it("leaves past days and days beyond 30 nights focusable but unpickable", () => {
    render(<Harness />);
    const past = day("Monday 9 November 2026, unavailable");
    expect(past).toHaveAttribute("aria-disabled", "true");
    expect(past).not.toBeDisabled();
    fireEvent.click(past);
    expect(screen.getByText("Select check-in")).toBeInTheDocument();

    fireEvent.click(day("Friday 13 November 2026"));
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    const beyond = day("Monday 14 December 2026, unavailable");
    expect(beyond).toHaveAttribute("aria-disabled", "true");
    expect(day("Sunday 13 December 2026")).not.toHaveAttribute("aria-disabled");

    fireEvent.click(beyond);
    beyond.focus();
    press("Enter");
    expect(beyond).toHaveFocus();
    expect(screen.getByText("Fri 13 Nov · Select check-out")).toBeInTheDocument();
  });

  it("starts from a pre-filled check-in", () => {
    render(<Harness initial={{ checkIn: "2026-11-13", checkOut: "2026-11-15" }} />);
    expect(day("Friday 13 November 2026, check-in")).toHaveAttribute("tabindex", "0");
  });
});

describe("RangeCalendar on phone", () => {
  it("stacks 12 months from today's month without Previous or Next", () => {
    render(<Harness layout="phone" />);

    const grids = screen.getAllByRole("grid");
    expect(grids).toHaveLength(12);
    expect(grids[0]).toHaveAccessibleName("November 2026");
    expect(grids[11]).toHaveAccessibleName("October 2027");
    expect(screen.queryByRole("button", { name: "Previous month" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next month" })).not.toBeInTheDocument();
  });

  it("moves focus between stacked months and stops at the last one", () => {
    render(<Harness layout="phone" />);
    dayIn("November 2026", "Tuesday 10 November 2026, today").focus();

    press("PageDown");
    expect(dayIn("December 2026", "Thursday 10 December 2026")).toHaveFocus();
    dayIn("October 2027", "Wednesday 27 October 2027").focus();
    press("ArrowDown");
    expect(dayIn("October 2027", "Sunday 31 October 2027")).toHaveFocus();
  });
});
