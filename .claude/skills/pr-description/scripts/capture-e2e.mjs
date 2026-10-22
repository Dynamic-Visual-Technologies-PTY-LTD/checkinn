#!/usr/bin/env node
// Captures review screenshots with the repo's Playwright setup and collects
// the PNGs and pass/fail counts into one folder.
//
//   node .claude/skills/pr-description/scripts/capture-e2e.mjs --out <dir> \
//     [--page <path>]... [--project <name>]... [spec files]... [-- <extra playwright args>]
//
// --page takes a full-page screenshot of that path (e.g. "/" or
// "/search?destination=Durban") on desktop and phone, with photos loaded.
// Spec files leave a screenshot of every test's final state.
//
// The repo's own playwright.config.ts is extended, never edited: a temporary
// config at the repo root (and, for --page, a temporary spec in e2e/) are
// deleted afterwards.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
let outDir;
const pages = [];
const projects = [];
const specs = [];
const extra = [];
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--") {
    extra.push(...args.slice(i + 1));
    break;
  }
  if (arg === "--out") outDir = args[++i];
  else if (arg === "--page") {
    const target = args[++i] ?? "";
    // Git Bash turns a leading "/" into a Windows path unless MSYS_NO_PATHCONV=1.
    if (/^[A-Za-z]:[\\/]/.test(target)) {
      console.error(`--page got "${target}": the shell rewrote the path. Rerun with MSYS_NO_PATHCONV=1, or from PowerShell.`);
      process.exit(2);
    }
    pages.push(target.startsWith("/") ? target : `/${target}`);
  }
  else if (arg === "--project") projects.push(args[++i]);
  else specs.push(arg);
}
if (!outDir || (pages.length === 0 && specs.length === 0)) {
  console.error("usage: capture-e2e.mjs --out <dir> [--page <path>]... [--project <name>]... [spec files]... [-- <playwright args>]");
  process.exit(2);
}

const repoRoot = process.cwd();
if (!existsSync(path.join(repoRoot, "playwright.config.ts"))) {
  console.error("Run this from the repo root: playwright.config.ts not found.");
  process.exit(2);
}

outDir = path.resolve(outDir);
const resultsDir = path.join(outDir, "test-results");
const screensDir = path.join(outDir, "screens");
const reportFile = path.join(outDir, "report.json");
rmSync(outDir, { recursive: true, force: true });
mkdirSync(screensDir, { recursive: true });

const slug = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);

// Read-only pages run in the desktop and phone projects, never the booking ones.
const pageSpec = path.join(repoRoot, "e2e", "pr-capture.tmp.spec.ts");
const pageProjects = ["chromium", "mobile"];
if (pages.length > 0) {
  writeFileSync(
    pageSpec,
    `import { test } from "@playwright/test";

for (const [target, name] of ${JSON.stringify(pages.map((p) => [p, slug(p) || "home"]))}) {
  test(\`page \${target}\`, async ({ page }, info) => {
    await page.goto(target);
    // Scroll through once so lazy images below the fold load.
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 150));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(300); // let entrance transitions finish
    await page.screenshot({
      path: ${JSON.stringify(screensDir)} + \`/\${info.project.name}--page-\${name}.png\`,
      fullPage: true,
    });
  });
}
`,
  );
}

const tempConfig = path.join(repoRoot, "playwright.pr-capture.config.ts");
writeFileSync(
  tempConfig,
  `import base from "./playwright.config";

export default {
  ...base,
  outputDir: ${JSON.stringify(resultsDir)},
  reporter: [["list"], ["json", { outputFile: ${JSON.stringify(reportFile)} }]],
  use: { ...base.use, screenshot: "on" },
};
`,
);

let status;
try {
  const files = pages.length > 0 ? [...specs, "e2e/pr-capture.tmp.spec.ts"] : specs;
  // Only the projects the chosen files belong to, without their dependencies,
  // which would otherwise run the whole read-only suite first.
  const isBooking = (file) => file.replaceAll("\\", "/").includes("e2e/booking/");
  const chosen =
    projects.length > 0
      ? projects
      : [
          ...(pages.length > 0 || specs.some((s) => !isBooking(s)) ? pageProjects : []),
          ...(specs.some(isBooking) ? ["booking-desktop", "booking-mobile"] : []),
        ];
  const cli = ["playwright", "test", "--config", tempConfig, ...files, ...chosen.flatMap((p) => ["--project", p]), ...extra];
  if (!extra.includes("--no-deps")) cli.push("--no-deps");
  console.log(`> npx ${cli.join(" ")}`);
  status = spawnSync("npx", cli, {
    stdio: "inherit",
    shell: process.platform === "win32",
    // Temporary capture specs save mid-test screenshots here.
    env: { ...process.env, PR_CAPTURE_DIR: screensDir },
  }).status;
} finally {
  rmSync(tempConfig, { force: true });
  rmSync(pageSpec, { force: true });
}

if (!existsSync(reportFile)) {
  console.error("Playwright wrote no JSON report; see the output above.");
  process.exit(status ?? 1);
}

const report = JSON.parse(readFileSync(reportFile, "utf8"));

const shots = [];
const tests = [];
const used = new Set();
const walk = (suite, titles) => {
  const here = suite.title ? [...titles, suite.title] : titles;
  for (const spec of suite.specs ?? []) {
    for (const test of spec.tests ?? []) {
      const result = test.results?.at(-1);
      const title = [...here, spec.title].join(" › ");
      tests.push({ title, project: test.projectName, status: test.status, file: spec.file });
      if (spec.file.includes("pr-capture.tmp")) {
        const name = `${test.projectName}--page-${slug(spec.title.replace(/^page /, "")) || "home"}.png`;
        if (existsSync(path.join(screensDir, name))) {
          shots.push({ file: path.join(screensDir, name), title, project: test.projectName, status: test.status });
        }
        continue;
      }
      // Capture specs save their own screenshots; skip their final-state ones.
      if (spec.file.endsWith(".tmp.spec.ts")) continue;
      for (const attachment of result?.attachments ?? []) {
        if (attachment.contentType !== "image/png" || !attachment.path || !existsSync(attachment.path)) continue;
        const base = `${slug(test.projectName)}--${slug(`${path.basename(spec.file, ".spec.ts")} ${spec.title}`)}`;
        let name = `${base}.png`;
        for (let n = 2; used.has(name); n++) name = `${base}-${n}.png`;
        used.add(name);
        copyFileSync(attachment.path, path.join(screensDir, name));
        shots.push({ file: path.join(screensDir, name), title, project: test.projectName, status: test.status });
      }
    }
  }
  for (const child of suite.suites ?? []) walk(child, here);
};
for (const suite of report.suites ?? []) walk(suite, []);
// Screenshots a capture spec saved itself into PR_CAPTURE_DIR.
for (const name of readdirSync(screensDir)) {
  const file = path.join(screensDir, name);
  if (name.endsWith(".png") && !shots.some((s) => s.file === file)) shots.push({ file, title: name, project: "", status: "saved" });
}

const manifest = { stats: report.stats, exitCode: status, tests, shots };
writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

const { expected = 0, unexpected = 0, flaky = 0, skipped = 0 } = report.stats ?? {};
console.log(`\n${expected} passed, ${unexpected} failed, ${flaky} flaky, ${skipped} skipped`);
for (const t of tests.filter((t) => t.status === "unexpected")) console.log(`  FAILED [${t.project}] ${t.title}`);
console.log(`${shots.length} screenshots in ${screensDir}`);
console.log(`manifest: ${path.join(outDir, "manifest.json")}`);
process.exit(status ?? 1);
