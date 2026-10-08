import { expect, it, vi } from "vitest";
import { metadata } from "./layout";

vi.mock("next/font/google", () => ({
  Poppins: () => ({ variable: "font-poppins" }),
}));

it("describes the site as CheckInn", () => {
  expect(metadata.title).toBe("CheckInn");
  expect(metadata.description).toBe("A simple hotel booking system.");
});
