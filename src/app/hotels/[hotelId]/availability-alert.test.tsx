import { render, screen } from "@testing-library/react";
import { type ReactNode, useInsertionEffect } from "react";
import { beforeEach, expect, it, vi } from "vitest";
import { AvailabilityAlert } from "./availability-alert";

/** Writes `url` at commit, as Next's HistoryUpdater does after a client redirect. */
function CommitUrl({ url, children }: { url: string; children: ReactNode }) {
  useInsertionEffect(() => {
    window.history.replaceState(null, "", url);
  }, [url]);
  return children;
}

const MESSAGE = "Sorry, the last Standard Double was just booked. Pick another room.";
const NOTICE_URL =
  "/hotels/hotel-001?checkIn=2026-11-13&checkOut=2026-11-15&adults=2&children=0&rooms=1" +
  "&sel=hotel-001-standard%3A1&notice=room-unavailable&rt=hotel-001-standard";

beforeEach(() => {
  window.history.replaceState(null, "", NOTICE_URL);
});

it("shows the message and takes focus once on mount", () => {
  render(<AvailabilityAlert message={MESSAGE} today="2026-11-10" />);

  const alert = screen.getByRole("group", { name: "Room no longer available" });
  expect(alert).toHaveTextContent(MESSAGE);
  expect(alert).toHaveFocus();
});

it("clears notice and rt from the URL by replacing the entry, keeping the rest", () => {
  const replace = vi.spyOn(window.history, "replaceState");
  const push = vi.spyOn(window.history, "pushState");

  render(<AvailabilityAlert message={MESSAGE} today="2026-11-10" />);

  const params = new URLSearchParams(window.location.search);
  expect(params.has("notice")).toBe(false);
  expect(params.has("rt")).toBe(false);
  expect(params.get("sel")).toBe("hotel-001-standard:1");
  expect(params.get("checkIn")).toBe("2026-11-13");
  expect(replace).toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
  replace.mockRestore();
  push.mockRestore();
});

it("drops sq and smart from the URL with the notice", () => {
  window.history.replaceState(null, "", `${NOTICE_URL}&sq=quiet+hotel&smart=1`);

  render(<AvailabilityAlert message={MESSAGE} today="2026-11-10" />);

  const params = new URLSearchParams(window.location.search);
  expect(params.has("sq")).toBe(false);
  expect(params.has("smart")).toBe(false);
  expect(params.get("sel")).toBe("hotel-001-standard:1");
});

it("shows and takes focus when the URL gains the notice only at commit, after a redirect", () => {
  // Next writes the redirect's URL at commit, so the first render still sees /book.
  window.history.replaceState(null, "", "/book?hotel=hotel-001&k=abc");
  render(
    <CommitUrl url={NOTICE_URL}>
      <AvailabilityAlert message={MESSAGE} today="2026-11-10" />
    </CommitUrl>,
  );

  const alert = screen.getByRole("group", { name: "Room no longer available" });
  expect(alert).toHaveTextContent(MESSAGE);
  expect(alert).toHaveFocus();
  expect(new URLSearchParams(window.location.search).has("notice")).toBe(false);
});

it("hides itself when restored from history after the notice was cleared", () => {
  window.history.replaceState(null, "", "/hotels/hotel-001?adults=2&children=0&rooms=1");

  render(<AvailabilityAlert message={MESSAGE} today="2026-11-10" />);

  expect(screen.queryByRole("group", { name: "Room no longer available" })).toBeNull();
});
