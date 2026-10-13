import { describe, expect, it, vi } from "vitest";
import { copyText } from "./clipboard";

function stubClipboard(clipboard: unknown) {
  vi.stubGlobal("navigator", { ...navigator, clipboard });
}

describe("copyText", () => {
  it("writes the text and resolves true", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard({ writeText });

    await expect(copyText("https://example.test/a")).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith("https://example.test/a");
  });

  it("resolves false when the Clipboard API is missing", async () => {
    stubClipboard(undefined);

    await expect(copyText("x")).resolves.toBe(false);
  });

  it("resolves false when the browser refuses", async () => {
    stubClipboard({ writeText: vi.fn().mockRejectedValue(new Error("NotAllowedError")) });

    await expect(copyText("x")).resolves.toBe(false);
  });
});
