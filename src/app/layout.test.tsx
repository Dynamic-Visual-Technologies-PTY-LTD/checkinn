import { expect, it, vi } from "vitest";
import { metadata } from "./layout";

vi.mock("next/font/google", () => ({
  Geist: () => ({ variable: "font-geist-sans" }),
  Geist_Mono: () => ({ variable: "font-geist-mono" }),
}));

it("describes the site as CheckInn", () => {
  expect(metadata.title).toBe("CheckInn");
  expect(metadata.description).toBe("A simple hotel booking system.");
});
