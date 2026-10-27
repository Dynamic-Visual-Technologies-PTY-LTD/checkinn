// The verification hook's decisions, kept pure so they can be tested without git or npm.

/** Consecutive blocks in one session before the hook lets the agent stop anyway. */
export const MAX_BLOCKS = 3;

/** Paths whose changes can't break lint, types or tests. */
export const IGNORED = [/^_bmad-output\//, /^docs\//, /\.md$/i, /^\.claude\/(?!hooks\/|settings\.json$)/];

/** The changed files that can affect lint, types or tests. */
export function codeFiles(files) {
  return files.filter((file) => !IGNORED.some((pattern) => pattern.test(file)));
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
