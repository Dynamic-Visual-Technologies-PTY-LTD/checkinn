import { describe, expect, it } from "vitest";
import { afterFailure, afterPass, codeFiles, MAX_BLOCKS } from "./verify-rules.mjs";

describe("codeFiles", () => {
  it("drops docs, BMAD output and Claude config other than the hook", () => {
    expect(
      codeFiles([
        "README.md",
        "AGENTS.md",
        "docs/workshop/README.md",
        "_bmad-output/initiative-checkinn-mvp/prd-checkinn/prd-checkinn.md",
        ".claude/skills/pr-description/SKILL.md",
        ".claude/launch.json",
      ]),
    ).toEqual([]);
  });

  it("keeps code, config, data and the hook itself", () => {
    const files = [
      "src/domain/pricing.ts",
      "e2e/search.spec.ts",
      "package.json",
      "data/seed/hotel-booking-demo.json",
      ".claude/hooks/verify.mjs",
      ".claude/settings.json",
    ];
    expect(codeFiles(files)).toEqual(files);
  });
});

describe("afterFailure", () => {
  it("blocks and counts attempts within one session", () => {
    let state = {};
    for (let attempt = 1; attempt <= MAX_BLOCKS; attempt += 1) {
      const result = afterFailure(state, "s1");
      expect(result).toMatchObject({ block: true, attempt });
      state = result.state;
    }
  });

  it("lets the agent stop after MAX_BLOCKS and starts counting again", () => {
    const capped = afterFailure({ session: "s1", blocks: MAX_BLOCKS }, "s1");
    expect(capped.block).toBe(false);
    expect(afterFailure(capped.state, "s1")).toMatchObject({ block: true, attempt: 1 });
  });

  it("starts at attempt 1 in a new session", () => {
    expect(afterFailure({ session: "s1", blocks: 2 }, "s2")).toMatchObject({ block: true, attempt: 1 });
  });
});

describe("afterPass", () => {
  it("clears the block count, so the next failure is attempt 1 again", () => {
    const passed = afterPass("abc");
    expect(passed).toEqual({ passed: "abc" });
    expect(afterFailure(passed, "s1")).toMatchObject({ block: true, attempt: 1 });
  });
});
