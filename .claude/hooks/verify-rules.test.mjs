// @vitest-environment node
import { describe, expect, it } from "vitest";
import { afterFailure, afterPass, changedFiles, codeFiles, fingerprint, MAX_BLOCKS } from "./verify-rules.mjs";

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

  it("keeps Markdown under the folders code and tests read from", () => {
    const files = ["src/content/terms.md", "e2e/fixtures/notes.md", "data/seed/README.md"];
    expect(codeFiles(files)).toEqual(files);
  });
});

/** A fake `git` that answers from a map of argument strings to stdout ("" when unknown). */
function fakeGit(answers) {
  const calls = [];
  const git = (args) => {
    calls.push(args.join(" "));
    return answers[args.join(" ")] ?? "";
  };
  return { git, calls };
}

describe("changedFiles", () => {
  it("diffs against the merge base with origin/main and adds untracked files", () => {
    const { git, calls } = fakeGit({
      "merge-base HEAD origin/main": "abc123\n",
      "diff --name-only abc123": "src/a.ts\nREADME.md\n",
      "ls-files --others --exclude-standard": "src/new.ts\nsrc/a.ts\n",
    });
    expect(changedFiles(git)).toEqual(["src/a.ts", "README.md", "src/new.ts"]);
    expect(calls).not.toContain("merge-base HEAD main");
  });

  it("falls back to local main when origin/main is missing", () => {
    const { git } = fakeGit({
      "merge-base HEAD main": "def456\n",
      "diff --name-only def456": "src/committed.ts\n",
    });
    expect(changedFiles(git)).toEqual(["src/committed.ts"]);
  });

  it("falls back to HEAD, uncommitted changes only, with neither", () => {
    const { git, calls } = fakeGit({ "diff --name-only HEAD": "src/dirty.ts\n" });
    expect(changedFiles(git)).toEqual(["src/dirty.ts"]);
    expect(calls).toContain("diff --name-only HEAD");
  });
});

describe("fingerprint", () => {
  const read = (contents) => (file) => contents[file] ?? null;

  it("is the same for the same files in any order", () => {
    const files = { "src/a.ts": "a", "src/b.ts": "b" };
    expect(fingerprint(["src/a.ts", "src/b.ts"], read(files))).toBe(fingerprint(["src/b.ts", "src/a.ts"], read(files)));
  });

  it("changes when a file's content changes or the file is deleted", () => {
    const before = fingerprint(["src/a.ts"], read({ "src/a.ts": "a" }));
    expect(fingerprint(["src/a.ts"], read({ "src/a.ts": "a2" }))).not.toBe(before);
    expect(fingerprint(["src/a.ts"], read({}))).not.toBe(before);
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
