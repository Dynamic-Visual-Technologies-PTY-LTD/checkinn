import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchStateProvider } from "@/components/search-state";
import type { SearchBarCriteria } from "@/domain/interpretation";
import type { ActionResult } from "@/domain/types";
import { SmartSearchBox } from "./smart-search-box";
import { SmartSearchProvider } from "./smart-search-provider";
import { TryAgain } from "./try-again";

const mocks = vi.hoisted(() => ({ submitQuery: vi.fn() }));
vi.mock("@/features/search/actions", () => ({ submitQuery: mocks.submitQuery }));

const QUERY = "a castle on the moon";
const current: SearchBarCriteria = {
  q: "Durban",
  stay: { checkIn: "2026-11-13", checkOut: "2026-11-15" },
  party: { adults: 2, children: 1, rooms: 1 },
};

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

function renderFallback() {
  return render(
    <SmartSearchProvider initialQuery={QUERY}>
      <SearchStateProvider initialStay={current.stay} initialParty={current.party}>
        <SmartSearchBox initialQuery={QUERY} destination={current.q} />
        <TryAgain query={QUERY} current={current} />
      </SearchStateProvider>
    </SmartSearchProvider>,
  );
}

const tryAgain = () => screen.getByRole("button", { name: "Try again" });
const box = () => screen.getByRole("textbox", { name: "Describe your stay" });

describe("TryAgain", () => {
  it("renders nothing without Smart search", () => {
    render(<TryAgain query={QUERY} current={current} />);
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("resubmits the URL's Query with the URL's Search bar values", async () => {
    renderFallback();
    // Text edited in the box but not submitted is not what Try again sends.
    fireEvent.change(box(), { target: { value: "something else" } });

    fireEvent.click(tryAgain());

    expect(mocks.submitQuery).toHaveBeenCalledExactlyOnceWith({ query: QUERY, current });
    expect(await screen.findByText("Reading your search…")).toBeInTheDocument();
    expect(box()).toHaveValue(QUERY);
    expect(box()).toHaveAttribute("readonly");
  });

  it("is aria-disabled and ignores presses while pending", async () => {
    renderFallback();
    expect(tryAgain()).not.toHaveAttribute("aria-disabled");

    fireEvent.click(tryAgain());
    expect(tryAgain()).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(tryAgain());
    expect(mocks.submitQuery).toHaveBeenCalledTimes(1);

    await settleAll();
    expect(tryAgain()).not.toHaveAttribute("aria-disabled");
  });
});
