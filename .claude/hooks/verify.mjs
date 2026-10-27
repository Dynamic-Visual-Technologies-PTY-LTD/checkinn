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
import { afterFailure, afterPass, changedFiles, codeFiles, fingerprint, MAX_BLOCKS } from "./verify-rules.mjs";

const OUTPUT_LINES = 60;
// Each check is one command line, run through the shell: on Windows npm is npm.cmd, which
// Node won't spawn without one, and passing an argument list with `shell: true` is
// deprecated (DEP0190) because the arguments are joined unescaped.
const CHECKS = [
  // .pr-description/ is gitignored scratch from the pr-description skill. CI never has it, so
  // this local-only ignore keeps the hook in line with CI's `npm run lint` on tracked files.
  ["lint", 'npm run lint -- --ignore-pattern ".pr-description/**"'],
  ["typecheck", "npm run typecheck"],
  ["tests", "npm test"],
];

const input = readInput();
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const stateDir = join(tmpdir(), "checkinn-verify-hook");
const stateFile = join(stateDir, `${createHash("sha1").update(root).digest("hex").slice(0, 12)}.json`);
const state = readState();

const changed = codeFiles(changedFiles(git));
if (changed.length === 0) process.exit(0);

const current = fingerprint(changed, readCodeFile);
if (state.passed === current) process.exit(0);

for (const [name, command] of CHECKS) {
  const run = spawnSync(command, { cwd: root, encoding: "utf8", shell: true, env: { ...process.env, CI: "1" } });
  if (run.status === 0) continue;

  // stop_hook_active is deliberately not checked: the agent stays blocked while a check
  // fails, and afterFailure's MAX_BLOCKS cap is what keeps that from looping forever.
  const failure = afterFailure(state, input.session_id);
  saveState(failure.state);
  if (!failure.block) {
    console.log(JSON.stringify({ systemMessage: `Verification hook: ${name} still fails after ${MAX_BLOCKS} attempts; letting the agent stop. Fix it before committing.` }));
    process.exit(0);
  }
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`.trim().split(/\r?\n/).slice(-OUTPUT_LINES).join("\n");
  console.error(`Verification hook: \`${command}\` failed (attempt ${failure.attempt} of ${MAX_BLOCKS}). Fix it before finishing.\n\n${output}`);
  process.exit(2);
}

saveState(afterPass(current));
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

function readCodeFile(file) {
  const path = join(root, file);
  return existsSync(path) ? readFileSync(path) : null;
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
