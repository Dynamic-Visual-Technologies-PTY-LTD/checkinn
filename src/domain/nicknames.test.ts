// @vitest-environment node
import { describe, expect, it } from "vitest";
import { loadSeed } from "@/db/seed";
import { normaliseText } from "@/domain/text";
import { CITY_NICKNAMES, cityFromNickname } from "./nicknames";

describe("CITY_NICKNAMES", () => {
  it("is keyed by normalised text", () => {
    for (const key of Object.keys(CITY_NICKNAMES)) expect(key).toBe(normaliseText(key));
  });

  it("names only seed Cities", () => {
    const cities = loadSeed().cities.map((city) => city.name);
    for (const city of Object.values(CITY_NICKNAMES)) expect(cities).toContain(city);
  });
});

describe("cityFromNickname", () => {
  it.each([
    ["Joburg", "Johannesburg"],
    ["jozi", "Johannesburg"],
    ["PE", "Gqeberha"],
    [" Cape ", "Cape Town"],
    ["DURBS", "Durban"],
  ])("maps %j to %s", (nickname, city) => {
    expect(cityFromNickname(nickname)).toBe(city);
  });

  it("leaves any other text unchanged", () => {
    expect(cityFromNickname("Sandton")).toBe("Sandton");
    expect(cityFromNickname("Cape Town")).toBe("Cape Town");
    expect(cityFromNickname("Kruger")).toBe("Kruger");
  });
});
