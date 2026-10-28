// The verification hook's decisions, kept free of real git and npm calls so they can be tested.
import { createHash } from "node:crypto";

/** Consecutive blocks in one session before the hook lets the agent stop anyway. */
export const MAX_BLOCKS = 3;

/**
 * Paths whose changes can't break lint, types or tests: BMAD output, docs, Claude config
 * other than the hook, and Markdown outside the folders code and tests read from.
 */
export const IGNORED = [
  /^_bmad-output\//,
  /^docs\//,
  /^(?!src\/|e2e\/|data\/).*\.md$/i,
  /^\.claude\/(?!hooks\/|settings\.json$)/,
];

/**
 * The project folder with an upper-case Windows drive letter. VS Code passes `c:\...`, and
 * Vitest run from that path loads `vitest` twice, so every suite fails in its setup file.
 */
export function projectRoot(path) {
  return path.replace(/^([a-z]):/, (_, drive) => `${drive.toUpperCase()}:`);
}

/** The changed files that can affect lint, types or tests. */
export function codeFiles(files) {
  return files.filter((file) => !IGNORED.some((pattern) => pattern.test(file)));
}

/**
 * Files changed on this branch, committed or not, using `git(args)` (stdout, or "" on failure).
 * Compared with the merge base with origin/main, else local main (no remote or a shallow clone),
 * else HEAD, where only uncommitted changes count. Untracked files always count.
 */
export function changedFiles(git) {
  const base =
    git(["merge-base", "HEAD", "origin/main"]).trim() || git(["merge-base", "HEAD", "main"]).trim() || "HEAD";
  const tracked = git(["diff", "--name-only", base]).split("\n");
  const untracked = git(["ls-files", "--others", "--exclude-standard"]).split("\n");
  return [...new Set([...tracked, ...untracked].map((file) => file.trim()).filter(Boolean))];
}

/**
 * A hash of the given files' paths and contents, using `read(file)` (contents, or null when the
 * file was deleted). Order doesn't matter, so it only changes when a code file does.
 */
export function fingerprint(files, read) {
  const hash = createHash("sha1");
  for (const file of [...files].sort()) {
    hash.update(`${file}\0`);
    hash.update(read(file) ?? "deleted");
  }
  return hash.digest("hex");
}

/**
 * What to do after a check fails: block the stop and count the attempt, or, past
 * MAX_BLOCKS in the same session, let the agent stop and start counting again.
 * A failure in a new session starts at attempt 1.
 */
export function afterFailure(state, session) {
  const attempt = state.session === session ? (state.blocks ?? 0) + 1 : 1;
  if (attempt > MAX_BLOCKS) return { block: false, attempt, state: { session, blocks: 0 } };
  return { block: true, attempt, state: { session, blocks: attempt } };
}

/** The state after every check passes: the passing fingerprint, with the block count cleared. */
export function afterPass(fingerprint) {
  return { passed: fingerprint };
}
