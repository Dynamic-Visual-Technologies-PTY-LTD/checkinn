import { describe, expect, it } from "vitest";
import { toUnitVector } from "./relevance";

function length(vector: Float32Array): number {
  return Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
}

describe("toUnitVector", () => {
  it("scales a vector to unit length, keeping its direction", () => {
    const unit = toUnitVector([3, 4]);
    expect(unit).toBeInstanceOf(Float32Array);
    expect(unit[0]).toBeCloseTo(0.6);
    expect(unit[1]).toBeCloseTo(0.8);
    expect(length(unit)).toBeCloseTo(1);
  });

  it("copies rather than changing its input", () => {
    const input = new Float32Array([0, 2]);
    const unit = toUnitVector(input);
    expect(unit).not.toBe(input);
    expect(Array.from(input)).toEqual([0, 2]);
    expect(Array.from(unit)).toEqual([0, 1]);
  });

  it("keeps the length of a 1024-dimension vector", () => {
    const unit = toUnitVector(Array.from({ length: 1024 }, (_, i) => i + 1));
    expect(unit).toHaveLength(1024);
    expect(length(unit)).toBeCloseTo(1);
  });

  it("throws on an all-zero, empty or non-finite vector", () => {
    expect(() => toUnitVector([0, 0, 0])).toThrow();
    expect(() => toUnitVector([])).toThrow();
    expect(() => toUnitVector([1, Number.NaN])).toThrow();
  });
});
