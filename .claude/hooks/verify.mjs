// Claude Code Stop hook: the agent can't finish while lint, typecheck or tests fail.
//
// Runs `npm run lint`, `npm run typecheck` and `npm test` in order and blocks the stop
// (exit 2, with the failing output on stderr) on the first failure, so the agent keeps
// working until they pass. It skips when no code changed since the last passing run,
// and gives up after three blocks in a row so a failure the agent can't fix never loops.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const MAX_BLOCKS = 3;
const OUTPUT_LINES = 60;
const CHECKS = [
  // .pr-description/ is gitignored scratch from the pr-description skill; CI never sees it.
  ["lint", ["run", "lint", "--", "--ignore-pattern", "\".pr-description/**\""]],
  ["typecheck", ["run", "typecheck"]],
  ["tests", ["test"]],
];
// Paths whose changes can't break lint, types or tests.
const IGNORED = [/^_bmad-output\//, /^docs\//, /\.md$/i, /^\.claude\/(?!hooks\/|settings\.json$)/];

const input = readInput();
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const stateDir = join(tmpdir(), "checkinn-verify-hook");
const stateFile = join(stateDir, `${createHash("sha1").update(root).digest("hex").slice(0, 12)}.json`);
const state = readState();

const changed = changedFiles().filter((file) => !IGNORED.some((pattern) => pattern.test(file)));
if (changed.length === 0) process.exit(0);

const fingerprint = codeFingerprint(changed);
if (state.passed === fingerprint) process.exit(0);

for (const [name, args] of CHECKS) {
  const run = spawnSync("npm", args, { cwd: root, encoding: "utf8", shell: true, env: { ...process.env, CI: "1" } });
  if (run.status === 0) continue;

  const blocks = state.session === input.session_id ? (state.blocks ?? 0) + 1 : 1;
  if (blocks > MAX_BLOCKS) {
    saveState({ session: input.session_id, blocks: 0 });
    console.log(JSON.stringify({ systemMessage: `Verification hook: ${name} still fails after ${MAX_BLOCKS} attempts; letting the agent stop. Fix it before committing.` }));
    process.exit(0);
  }
  saveState({ session: input.session_id, blocks });
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`.trim().split(/\r?\n/).slice(-OUTPUT_LINES).join("\n");
  console.error(`Verification hook: \`npm ${args.join(" ")}\` failed (attempt ${blocks} of ${MAX_BLOCKS}). Fix it before finishing.\n\n${output}`);
  process.exit(2);
}

saveState({ passed: fingerprint });
process.exit(0);

function readInput() {
  try {
    return JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return {};
  }
}

function git(args) {
  const run = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  return run.status === 0 ? run.stdout : "";
}

/** Files changed on this branch, committed or not: against the merge base with main, plus untracked. */
function changedFiles() {
  const base = git(["merge-base", "HEAD", "origin/main"]).trim() || "HEAD";
  const tracked = git(["diff", "--name-only", base]).split("\n");
  const untracked = git(["ls-files", "--others", "--exclude-standard"]).split("\n");
  return [...new Set([...tracked, ...untracked].map((file) => file.trim()).filter(Boolean))];
}

/** The content of the changed code files, so editing docs alone never re-runs the checks. */
function codeFingerprint(files) {
  const hash = createHash("sha1");
  for (const file of [...files].sort()) {
    hash.update(`${file}\0`);
    hash.update(existsSync(join(root, file)) ? readFileSync(join(root, file)) : "deleted");
  }
  return hash.digest("hex");
}

function readState() {
  try {
    return JSON.parse(readFileSync(stateFile, "utf8"));
  } catch {
    return {};
  }
}

function saveState(next) {
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(stateFile, JSON.stringify(next));
}
