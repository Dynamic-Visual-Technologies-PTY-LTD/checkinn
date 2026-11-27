import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchBar } from "@/components/search-bar";
import { SearchStateProvider } from "@/components/search-state";
import type { ActionResult, Party, Stay } from "@/domain/types";
import { setViewportWidth } from "@/test/viewport";
import { SmartSearchBox } from "./smart-search-box";
import { SmartPendingListing, SmartSearchProvider } from "./smart-search-provider";

const mocks = vi.hoisted(() => ({
  submitQuery: vi.fn(),
  push: vi.fn(),
}));
vi.mock("@/features/search/actions", () => ({ submitQuery: mocks.submitQuery }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

const stay: Stay = { checkIn: "2026-11-11", checkOut: "2026-11-12" };
const party: Party = { adults: 2, children: 0, rooms: 1 };
const UJ1 = "pet friendly family place in Stellenbosch for 4 next weekend, up to R2000 a night";

function renderBox({
  initialQuery = "",
  destination = "",
  withBar = false,
}: { initialQuery?: string; destination?: string; withBar?: boolean } = {}) {
  return render(
    <SmartSearchProvider initialQuery={initialQuery}>
      <SearchStateProvider initialStay={stay} initialParty={party}>
        <SmartSearchBox initialQuery={initialQuery} destination={destination} />
        {withBar && <SearchBar today="2026-11-10" getToday={() => "2026-11-10"} />}
        <h1>Results heading</h1>
        <SmartPendingListing skeleton={<p>Skeleton cards</p>}>
          <p>Results</p>
        </SmartPendingListing>
      </SearchStateProvider>
    </SmartSearchProvider>,
  );
}

const box = () => screen.getByRole("textbox", { name: "Describe your stay" });
const submit = () => screen.getByRole("button", { name: "Search by description" });
const status = () => screen.getByRole("status");

/*
 * Every submitQuery call stays in flight until the test settles it. React
 * entangles async transitions, so each is settled after its test; one left
 * pending would keep the next test's transition pending too.
 */
let inFlight: ((result: ActionResult | undefined) => void)[] = [];

function settleAll(result?: ActionResult) {
  const calls = inFlight;
  inFlight = [];
  return act(async () => calls.forEach((settle) => settle(result)));
}

beforeEach(() => {
  inFlight = [];
  mocks.submitQuery.mockReset().mockImplementation(
    () =>
      new Promise<ActionResult | undefined>((resolve) => {
        inFlight.push(resolve);
      }),
  );
  mocks.push.mockReset();
  setViewportWidth(1280);
});

afterEach(async () => {
  await settleAll();
});

describe("SmartSearchBox", () => {
  it("is a one-line textarea of up to 300 characters, labelled Describe your stay", () => {
    renderBox();

    expect(box().tagName).toBe("TEXTAREA");
    expect(box()).toHaveAttribute("rows", "1");
    expect(box()).toHaveAttribute("maxlength", "300");
    expect(box()).toHaveAttribute("enterkeyhint", "search");
    expect(box()).toHaveAttribute(
      "placeholder",
      "Try: quiet hotel with a pool in Cape Town this weekend",
    );
    expect(box()).toHaveAccessibleDescription(/^Press Enter to search\s*$/);
  });

  it("has an empty status region on load", () => {
    renderBox();
    expect(status()).toHaveTextContent("");
    expect(status()).toHaveAttribute("id", "ss-status");
  });

  it("disables the submit while the box is empty", () => {
    renderBox();
    expect(submit()).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(submit());
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(mocks.submitQuery).not.toHaveBeenCalled();

    fireEvent.change(box(), { target: { value: "   " } });
    fireEvent.keyDown(box(), { key: "Enter" });
    expect(mocks.submitQuery).not.toHaveBeenCalled();
  });

  it("submits on Enter with the trimmed Query and the current criteria", () => {
    renderBox({ destination: "Cape Town" });

    fireEvent.change(box(), { target: { value: `  ${UJ1} ` } });
    expect(submit()).not.toHaveAttribute("aria-disabled");
    const enter = fireEvent.keyDown(box(), { key: "Enter" });

    // preventDefault: Enter never adds a line break.
    expect(enter).toBe(false);
    expect(mocks.submitQuery).toHaveBeenCalledWith({
      query: UJ1,
      current: { q: "Cape Town", stay, party },
    });
  });

  it("leaves Enter alone during IME composition", () => {
    renderBox();
    fireEvent.change(box(), { target: { value: "quiet hotel" } });
    fireEvent.keyDown(box(), { key: "Enter", isComposing: true });
    expect(mocks.submitQuery).not.toHaveBeenCalled();
  });

  it("submits from the submit button", () => {
    renderBox();
    fireEvent.change(box(), { target: { value: "quiet hotel" } });
    fireEvent.click(submit());
    expect(mocks.submitQuery).toHaveBeenCalledTimes(1);
  });

  it("is read-only while submitting, reads Reading your search…, and ignores a second submit", async () => {
    renderBox({ withBar: true });
    fireEvent.change(box(), { target: { value: "quiet hotel" } });
    fireEvent.keyDown(box(), { key: "Enter" });

    expect(await screen.findByText("Reading your search…")).toBe(status());
    expect(box()).toHaveAttribute("readonly");
    expect(submit()).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("button", { name: "Clear description" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );

    fireEvent.keyDown(box(), { key: "Enter" });
    fireEvent.click(submit());
    expect(mocks.submitQuery).toHaveBeenCalledTimes(1);
  });

  it("makes the Search bar read-only and aria-disabled while submitting", async () => {
    renderBox({ withBar: true });
    const bar = screen.getByRole("search", { name: "Search hotels" });
    fireEvent.change(box(), { target: { value: "quiet hotel" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    await screen.findByText("Reading your search…");

    const destination = within(bar).getByRole("textbox", { name: "Destination" });
    expect(destination).toHaveAttribute("readonly");
    expect(destination).toHaveAccessibleDescription("Reading your search…");
    for (const name of [/^Dates/, /^Occupancy/, /^Search$/]) {
      const control = within(bar).getByRole("button", { name });
      expect(control).toHaveAttribute("aria-disabled", "true");
      expect(control).not.toBeDisabled();
    }

    fireEvent.click(within(bar).getByRole("button", { name: /^Dates/ }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(within(bar).getByRole("button", { name: "Search" }));
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("shows the skeleton cards in place of the cards only while submitting", async () => {
    renderBox();
    const heading = screen.getByRole("heading", { name: "Results heading" });
    expect(screen.getByText("Results")).toBeInTheDocument();

    fireEvent.change(box(), { target: { value: "quiet hotel" } });
    fireEvent.keyDown(box(), { key: "Enter" });

    expect(await screen.findByText("Skeleton cards")).toBeInTheDocument();
    expect(screen.queryByText("Results")).not.toBeInTheDocument();
    // The heading around the cards stays mounted.
    expect(screen.getByRole("heading", { name: "Results heading" })).toBe(heading);
  });

  it("shows a VALIDATION message under the field and becomes editable again", async () => {
    renderBox();
    fireEvent.change(box(), { target: { value: "quiet hotel" } });
    fireEvent.keyDown(box(), { key: "Enter" });
    await screen.findByText("Reading your search…");

    await settleAll({ ok: false, code: "VALIDATION", message: "Describe your stay to search." });

    expect(screen.getByText("Describe your stay to search.")).toBeInTheDocument();
    expect(box()).toHaveAccessibleDescription(/Describe your stay to search\.$/);
    await waitFor(() => expect(box()).not.toHaveAttribute("readonly"));
    expect(status()).toHaveTextContent("");
  });

  it("clears with ×, keeping focus in the box and running no search", () => {
    renderBox({ initialQuery: "quiet hotel" });
    expect(box()).toHaveValue("quiet hotel");

    fireEvent.click(screen.getByRole("button", { name: "Clear description" }));

    expect(box()).toHaveValue("");
    expect(box()).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Clear description" })).not.toBeInTheDocument();
    expect(mocks.submitQuery).not.toHaveBeenCalled();
  });

  it("shows the counter from 250 characters", () => {
    renderBox();
    const counter = document.getElementById("ss-counter");
    expect(counter).toHaveTextContent("");

    fireEvent.change(box(), { target: { value: "a".repeat(249) } });
    expect(counter).toHaveTextContent("");

    fireEvent.change(box(), { target: { value: "a".repeat(250) } });
    expect(counter).toHaveTextContent("250 / 300");
    expect(screen.getByText("250 of 300 characters used")).toHaveClass("sr-only");
  });

  it("announces the limit once, in the empty-on-load status region", () => {
    renderBox();
    expect(status()).toHaveTextContent("");

    fireEvent.change(box(), { target: { value: "a".repeat(299) } });
    expect(status()).toHaveTextContent("");

    fireEvent.change(box(), { target: { value: "a".repeat(300) } });
    expect(status()).toHaveTextContent("300 of 300 characters, the limit");

    // Still at the limit: not said again.
    fireEvent.change(box(), { target: { value: "b".repeat(300) } });
    expect(status()).toHaveTextContent("300 of 300 characters, the limit");

    fireEvent.change(box(), { target: { value: "a".repeat(299) } });
    expect(status()).toHaveTextContent("");
  });

  it("announces the limit when a longer paste is cut at 300", () => {
    renderBox();
    fireEvent.change(box(), { target: { value: "a".repeat(320) } });
    expect(status()).toHaveTextContent("300 of 300 characters, the limit");
  });

  it("clears an error when a new Query arrives from the URL", async () => {
    const view = renderBox({ initialQuery: "quiet hotel" });
    fireEvent.keyDown(box(), { key: "Enter" });
    await screen.findByText("Reading your search…");
    await settleAll({
      ok: false,
      code: "SERVER_ERROR",
      message: "Something went wrong on our side. Try again.",
    });
    expect(screen.getByText("Something went wrong on our side. Try again.")).toBeInTheDocument();

    view.rerender(
      <SmartSearchProvider initialQuery="">
        <SearchStateProvider initialStay={stay} initialParty={party}>
          <SmartSearchBox />
        </SearchStateProvider>
      </SmartSearchProvider>,
    );

    expect(
      screen.queryByText("Something went wrong on our side. Try again."),
    ).not.toBeInTheDocument();
    expect(box()).not.toHaveAttribute("aria-invalid");
  });

  it("cuts a longer paste at 300 characters", () => {
    renderBox();
    fireEvent.change(box(), { target: { value: "a".repeat(320) } });
    expect(box()).toHaveValue("a".repeat(300));
  });
});
