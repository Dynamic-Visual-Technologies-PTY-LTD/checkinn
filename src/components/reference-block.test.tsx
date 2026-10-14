import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReferenceBlock } from "./reference-block";

function stubClipboard(clipboard: unknown) {
  vi.stubGlobal("navigator", { ...navigator, clipboard });
}

async function pressCopy() {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Copy booking reference CI-7K3P9Q" }));
  });
}

describe("ReferenceBlock", () => {
  it("shows the eyebrow and the reference as selectable text", () => {
    render(<ReferenceBlock reference="CI-7K3P9Q" />);

    expect(screen.getByText("Booking reference")).toBeInTheDocument();
    expect(screen.getByText("CI-7K3P9Q")).toHaveClass("select-all");
  });

  it("copies the reference and says so in a toast", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ writeText });
    render(<ReferenceBlock reference="CI-7K3P9Q" />);

    await pressCopy();

    expect(writeText).toHaveBeenCalledWith("CI-7K3P9Q");
    expect(screen.getByRole("status")).toHaveTextContent("Reference copied");
  });

  it("selects the reference when the clipboard is blocked", async () => {
    stubClipboard({ writeText: vi.fn().mockRejectedValue(new Error("blocked")) });
    render(<ReferenceBlock reference="CI-7K3P9Q" />);

    await pressCopy();

    expect(window.getSelection()?.toString()).toBe("CI-7K3P9Q");
    expect(screen.getByRole("status")).toHaveTextContent("");
  });
});
