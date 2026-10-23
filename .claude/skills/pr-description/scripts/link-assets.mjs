#!/usr/bin/env node
// Rewrites repo-relative image paths in a PR body to permanent GitHub links
// pinned to the pushed HEAD commit, so they keep working after the next PR
// replaces the images folder.
//
//   node .claude/skills/pr-description/scripts/link-assets.mjs <body.md> [--dir docs/pr-assets]
//
// Fails, changing nothing, if HEAD is not pushed or a referenced image is not
// in the HEAD commit.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const bodyFile = args.find((a) => !a.startsWith("--"));
const dirIndex = args.indexOf("--dir");
const assetDir = (dirIndex >= 0 ? args[dirIndex + 1] : "docs/pr-assets").replace(/\/+$/, "");
if (!bodyFile) {
  console.error("usage: link-assets.mjs <body.md> [--dir docs/pr-assets]");
  process.exit(2);
}

const git = (...a) => execFileSync("git", a, { encoding: "utf8" }).trim();
const sha = git("rev-parse", "HEAD");

let upstream;
try {
  upstream = git("rev-parse", "@{u}");
} catch {
  console.error("HEAD has no upstream branch. Push the branch first.");
  process.exit(1);
}
if (upstream !== sha) {
  console.error(`HEAD ${sha.slice(0, 7)} is not what the upstream has (${upstream.slice(0, 7)}). Push first.`);
  process.exit(1);
}

const remote = git("remote", "get-url", "origin");
const match = remote.match(/github\.com[:/]([^/]+)\/(.+?)(\.git)?$/);
if (!match) {
  console.error(`origin is not a GitHub remote: ${remote}`);
  process.exit(1);
}
const [, owner, repo] = match;

const body = readFileSync(bodyFile, "utf8");
const escaped = assetDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Markdown `](docs/pr-assets/x.png)` and HTML `src="docs/pr-assets/x.png"`.
const pattern = new RegExp(`(\\]\\(|src=")(?:\\./)?(${escaped}/[^)"\\s]+)`, "g");

const missing = new Set();
let count = 0;
const linked = body.replace(pattern, (_, lead, file) => {
  try {
    git("cat-file", "-e", `${sha}:${file}`);
  } catch {
    missing.add(file);
  }
  count++;
  return `${lead}https://github.com/${owner}/${repo}/blob/${sha}/${file}?raw=true`;
});

if (missing.size > 0) {
  console.error(`Not in commit ${sha.slice(0, 7)}:\n  ${[...missing].join("\n  ")}`);
  process.exit(1);
}
writeFileSync(bodyFile, linked);
console.log(`Linked ${count} image reference(s) to ${owner}/${repo}@${sha.slice(0, 7)}.`);
