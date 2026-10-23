import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchStateProvider } from "@/components/search-state";
import type { ActionResult, Party, Stay } from "@/domain/types";
import { EXAMPLE_QUERIES, ExampleQueries } from "./example-queries";
import { SmartSearchBox } from "./smart-search-box";
import { SmartSearchProvider } from "./smart-search-provider";

const mocks = vi.hoisted(() => ({ submitQuery: vi.fn() }));
vi.mock("@/features/search/actions", () => ({ submitQuery: mocks.submitQuery }));

const stay: Stay = { checkIn: "2026-11-11", checkOut: "2026-11-12" };
const party: Party = { adults: 2, children: 1, rooms: 1 };

/* Each submitQuery call stays in flight until the test settles it. */
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
});

afterEach(async () => {
  await settleAll();
});

function renderHome() {
  return render(
    <SmartSearchProvider>
      <SearchStateProvider initialStay={stay} initialParty={party}>
        <SmartSearchBox />
        <ExampleQueries />
      </SearchStateProvider>
    </SmartSearchProvider>,
  );
}

const examples = () => screen.getByRole("list", { name: "Try an example" });

describe("ExampleQueries", () => {
  it("lists the three PRD Queries as buttons named by their text, labelled Try an example", () => {
    renderHome();

    expect(screen.getByText("Try an example")).toBeVisible();
    const buttons = within(examples()).getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      "pet friendly family place in Stellenbosch for 4 next weekend, up to R2000 a night",
      "quiet business hotel in Gauteng with a gym and meeting rooms",
      "ski chalet with a fireplace",
    ]);
    expect(EXAMPLE_QUERIES).toHaveLength(3);
  });

  it("fills the box and submits with the Search bar's Stay and Party, keeping focus", async () => {
    renderHome();
    const button = screen.getByRole("button", { name: EXAMPLE_QUERIES[1] });
    button.focus();

    await act(async () => fireEvent.click(button));

    expect(screen.getByRole("textbox", { name: "Describe your stay" })).toHaveValue(
      EXAMPLE_QUERIES[1],
    );
    expect(mocks.submitQuery).toHaveBeenCalledWith({
      query: EXAMPLE_QUERIES[1],
      current: { q: "", stay, party },
    });
    expect(screen.getByRole("status")).toHaveTextContent("Reading your search…");
    expect(button).toHaveFocus();
  });

  it("makes every button aria-disabled while submitting, and ignores a second click", async () => {
    renderHome();
    const [first, second] = within(examples()).getAllByRole("button");

    await act(async () => fireEvent.click(first));

    for (const button of within(examples()).getAllByRole("button")) {
      expect(button).toHaveAttribute("aria-disabled", "true");
      expect(button).toBeEnabled();
    }
    await act(async () => fireEvent.click(second));
    expect(mocks.submitQuery).toHaveBeenCalledTimes(1);

    await settleAll({ ok: false, code: "SERVER_ERROR", message: "Something went wrong." });
    expect(first).not.toHaveAttribute("aria-disabled");
  });

  it("fills the box again when the same Example is clicked after a failure and an edit", async () => {
    renderHome();
    const button = screen.getByRole("button", { name: EXAMPLE_QUERIES[2] });
    const box = screen.getByRole("textbox", { name: "Describe your stay" });

    await act(async () => fireEvent.click(button));
    await settleAll({ ok: false, code: "SERVER_ERROR", message: "Something went wrong." });
    fireEvent.change(box, { target: { value: "cosy weekend retreat" } });
    await act(async () => fireEvent.click(button));

    expect(box).toHaveValue(EXAMPLE_QUERIES[2]);
    expect(mocks.submitQuery).toHaveBeenLastCalledWith({
      query: EXAMPLE_QUERIES[2],
      current: { q: "", stay, party },
    });
  });

  it("renders nothing without Smart search", () => {
    render(
      <SearchStateProvider initialStay={stay} initialParty={party}>
        <ExampleQueries />
      </SearchStateProvider>,
    );
    expect(screen.queryByRole("list", { name: "Try an example" })).not.toBeInTheDocument();
  });
});
