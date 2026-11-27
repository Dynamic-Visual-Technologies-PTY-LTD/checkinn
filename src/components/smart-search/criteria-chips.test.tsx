import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { type ResultsCriteria, searchHref, smartCriteria } from "@/domain/criteria";
import { CriteriaChips } from "./criteria-chips";
import { ResultsHeading } from "./results-heading";
import { SMART_INPUT_ID } from "./smart-search-context";
import { ResultsStatus, SmartSearchProvider } from "./smart-search-provider";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/features/search/actions", () => ({ submitQuery: vi.fn() }));

const NBSP = " ";
const MAX = `Max R${NBSP}2${NBSP}000 per night`;

const base = {
  q: "Stellenbosch",
  stay: { checkIn: "2026-11-13", checkOut: "2026-11-15" },
  party: { adults: 4, children: 0, rooms: 1 },
};
const mvp =
  "/search?q=Stellenbosch&checkIn=2026-11-13&checkOut=2026-11-15&adults=4&children=0&rooms=1";

function criteria(maxPriceRand: number | null, policies: ("pets" | "children" | "smoking")[]) {
  return {
    ...base,
    smart: smartCriteria("family place", true, { maxPriceRand, policies }),
  } satisfies ResultsCriteria;
}

/**
 * The page's pieces: a keyed box stand-in, the unkeyed chip row, a keyed
 * heading and the status. The address bar holds the page's URL, as after a
 * committed navigation.
 */
function Page({ url, heading }: { url: ResultsCriteria; heading?: string }) {
  const href = searchHref(url);
  return (
    <SmartSearchProvider initialQuery="family place" url={href}>
      <textarea key={`box:${href}`} id={SMART_INPUT_ID} aria-label="Describe your stay" />
      <CriteriaChips criteria={url} />
      {heading && <ResultsHeading key={`heading:${href}`}>{heading}</ResultsHeading>}
      <ResultsStatus />
    </SmartSearchProvider>
  );
}

/** Renders, or re-renders, a page and moves the address bar to it. */
function show(view: ReturnType<typeof render> | null, url: ResultsCriteria, heading?: string) {
  window.history.replaceState(null, "", searchHref(url));
  if (view) {
    view.rerender(<Page url={url} heading={heading} />);
    return view;
  }
  return render(<Page url={url} heading={heading} />);
}

const chipRow = () => screen.getByRole("list", { name: "Your filters" });
const chip = (name: string) => screen.getByRole("button", { name });
const status = () => screen.getByRole("status", { name: "Result count" });

beforeEach(() => {
  mocks.push.mockReset();
});

describe("CriteriaChips", () => {
  it("lists one chip per criterion, Max price first, named Remove plus its copy", () => {
    show(null, criteria(2000, ["pets", "children", "smoking"]));

    const buttons = within(chipRow()).getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      `Remove ${MAX}`,
      "Remove Pets allowed",
      "Remove Children allowed",
      "Remove Smoking allowed",
    ]);
    // The × adds nothing to the name, and no aria-label replaces the text.
    expect(buttons[1]).toHaveAccessibleName("Remove Pets allowed");
    expect(chip(`Remove ${MAX}`)).not.toHaveAttribute("aria-label");
  });

  it("renders nothing without Max price or Policy criteria", () => {
    show(null, criteria(null, []));
    expect(screen.queryByRole("list", { name: "Your filters" })).not.toBeInTheDocument();
  });

  it("pushes the URL without the criterion and focuses the next chip", () => {
    show(null, criteria(2000, ["pets"]));

    fireEvent.click(chip(`Remove ${MAX}`));

    expect(mocks.push).toHaveBeenCalledWith(
      `${mvp}&sq=family+place&smart=1&policy=pets`,
      { scroll: false },
    );
    expect(chip("Remove Pets allowed")).toHaveFocus();
  });

  it("builds a quick second removal on the first, not on the stale page", () => {
    show(null, criteria(2000, ["pets"]));

    fireEvent.click(chip(`Remove ${MAX}`));
    // The first navigation is still in flight: same props, same address bar.
    fireEvent.click(chip("Remove Pets allowed"));

    expect(mocks.push).toHaveBeenLastCalledWith(`${mvp}&sq=family+place&smart=1`, {
      scroll: false,
    });
  });

  it("focuses the previous chip when the last one is removed", () => {
    show(null, criteria(2000, ["pets"]));

    fireEvent.click(chip("Remove Pets allowed"));
    expect(mocks.push).toHaveBeenCalledWith(`${mvp}&sq=family+place&smart=1&maxPrice=2000`, {
      scroll: false,
    });
    expect(chip(`Remove ${MAX}`)).toHaveFocus();
  });

  it("focuses the box when no chip is left", () => {
    show(null, criteria(2000, []));

    fireEvent.click(chip(`Remove ${MAX}`));
    expect(screen.getByRole("textbox", { name: "Describe your stay" })).toHaveFocus();
  });

  it("keeps the surviving chip's node and focus through the update, and says the count once", () => {
    const view = show(null, criteria(2000, ["pets"]), "1 property found");
    expect(status()).toBeEmptyDOMElement();
    const survivor = chip(`Remove ${MAX}`);

    fireEvent.click(chip("Remove Pets allowed"));
    expect(survivor).toHaveFocus();
    const blurred = vi.fn();
    survivor.addEventListener("focusout", blurred);
    show(view, criteria(2000, []), "Stellenbosch: 2 properties found");

    expect(chip(`Remove ${MAX}`)).toBe(survivor);
    expect(survivor).toHaveFocus();
    expect(blurred).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Stellenbosch: 2 properties found" })).not.toHaveFocus();
    expect(status()).toHaveTextContent("Stellenbosch: 2 properties found");
  });

  it("restores focus to the box when the last chip goes", () => {
    const view = show(null, criteria(2000, []), "1 property found");

    fireEvent.click(chip(`Remove ${MAX}`));
    show(view, criteria(null, []), "Stellenbosch: 2 properties found");

    expect(screen.getByRole("textbox", { name: "Describe your stay" })).toHaveFocus();
    expect(status()).toHaveTextContent("Stellenbosch: 2 properties found");
  });

  it("lets the heading take focus on any other navigation", () => {
    const view = show(null, criteria(2000, []), "1 property found");
    show(view, criteria(1500, []), "No change");

    expect(screen.getByRole("heading", { name: "No change" })).toHaveFocus();
    expect(status()).toBeEmptyDOMElement();
  });

  it("ends a removal that another navigation overtakes", () => {
    const view = show(null, criteria(2000, ["pets"]), "1 property found");

    fireEvent.click(chip("Remove Pets allowed"));
    // Back, or a Search bar Search, lands somewhere else before the removal.
    show(view, criteria(1500, ["pets"]), "Elsewhere");
    expect(screen.getByRole("heading", { name: "Elsewhere" })).toHaveFocus();

    show(view, criteria(1500, []), "Later");
    expect(screen.getByRole("heading", { name: "Later" })).toHaveFocus();
    expect(status()).toBeEmptyDOMElement();
  });
});
