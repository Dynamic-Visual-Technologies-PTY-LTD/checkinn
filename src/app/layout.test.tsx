import { expect, it, vi } from "vitest";
import { metadata } from "./layout";

vi.mock("next/font/local", () => ({
  default: () => ({ variable: "font-poppins" }),
}));

it("describes the site as CheckInn", () => {
  expect(metadata.description).toBe("A simple hotel booking system.");
});

it("titles pages with the CheckInn template", () => {
  expect(metadata.title).toEqual({
    default: "CheckInn",
    template: "%s · CheckInn",
  });
});
