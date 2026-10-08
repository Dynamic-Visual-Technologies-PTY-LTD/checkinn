# CheckInn

## Product Overview

**What it is.** CheckInn is a simple hotel-booking web application: a guest searches for a hotel, views it, and books a stay.

**Why it exists.** Finding the right hotel should not take a dozen filters. CheckInn gives guests a short path from "I need somewhere to stay" to a confirmed booking. The planned enhancement is intelligent search: a guest describes what they want in plain language and results are ranked by how well they match (RAG over the hotel data).

**Who it is for.** *Guests*: people looking for and booking a hotel stay, on desktop or mobile.

**What that means for technical decisions.**

- Guest-facing behaviour comes first. A change is judged by what a guest can do and see.
- It must run from a fresh clone with `npm install && npm run dev` and no external services.
- Keep it small and readable. Prefer the simple solution over the clever one.
- The repo is public. No secrets, client names or internal material.

**Current state.** Project shell only: a placeholder home page. No booking features, no database, no search.

## Technology Stack

| Area | Choice | Version |
|---|---|---|
| Runtime | Node.js | 24 (pinned in `.nvmrc`) |
| Language | TypeScript, `strict` | 5.9.3 |
| Framework | Next.js, App Router, Turbopack | 16.4.0 |
| UI | React | 19.3.0 |
| Styling | Tailwind CSS | 4.3.3 |
| Unit and component tests | Vitest, Testing Library, jsdom | 5.0.3 / 16.3.3 / 30.1.2 |
| End-to-end tests | Playwright, Chromium (desktop and mobile viewport) | 1.64.0 |
| Linting | ESLint with `eslint-config-next` | 9.39.5 / 16.4.0 |
| Package manager | npm | lockfile committed |
| Design tokens | `@google/design.md` CLI | 0.4.0 |
| CI | GitHub Actions | `.github/workflows/ci.yml` |

Agreed but **not installed yet**:

| Area | Choice |
|---|---|
| Database | SQLite, embedded in the app |
| Data access | Drizzle ORM with `better-sqlite3` |
| Vector search | `sqlite-vec`, for the search enhancement |
| Hosting | Azure |
| Infrastructure as code | Bicep or Terraform, undecided |

**Constraints.**

- One full-stack Next.js app. Server components, server actions and route handlers do the server work. No separate API service.
- No database server and no paid search service. Data lives in a SQLite file.
- Use what is listed here before reaching for an alternative. A new dependency is an "ask first" change.
- `next.config.ts` enables `cacheComponents` and `partialPrefetching`. Next.js 16 differs from earlier versions; see the Next.js block at the end of this file.

## Project Structure

| Path | Contents |
|---|---|
| `src/app/` | Routes, layouts and pages (App Router) |
| `e2e/` | Playwright end-to-end tests, configured in `playwright.config.ts` |
| `DESIGN.md` | Visual identity: design tokens and usage rules, in the [DESIGN.md format](https://github.com/google-labs-code/design.md) |
| `infra/` | Infrastructure as code. Placeholder, no code yet |
| `.github/workflows/` | CI |
| `.vscode/` | Shared VS Code debug configurations, tasks and extension recommendations |
| `_bmad/` | BMAD configuration and scripts. Written by BMAD setup |
| `_bmad-output/` | BMAD planning artefacts: PRD, UX, architecture, specs |
| `.claude/skills/`, `.agents/skills/` | BMAD skills, installed by the `skills` CLI and tracked in `skills-lock.json` |

Generated or tool-managed, do not edit by hand: `.claude/skills/`, `.agents/skills/`, `_bmad/scripts/`, `skills-lock.json`, `next-env.d.ts`, `.next/`.

**Naming and imports.**

- Import from `src/` through the `@/` alias, not long relative paths.
- Unit and component tests sit beside the code they cover, named `*.test.ts` or `*.test.tsx`. Vitest runs these.
- End-to-end tests live in `e2e/`, named `*.spec.ts`. Playwright runs these. Keep the two suffixes apart so neither runner picks up the other's files.
- Route files follow App Router names: `page.tsx`, `layout.tsx`, `route.ts`.

```ts
import { formatPrice } from "@/lib/format";   // yes
import { formatPrice } from "../../../lib/format"; // no
```

## Commands

| Task | Command |
|---|---|
| Install | `npm install` |
| Run the dev server (http://localhost:3000) | `npm run dev` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Run tests once | `npm test` |
| Run tests in watch mode | `npm run test:watch` |
| Run one test file | `npx vitest run src/app/page.test.tsx` |
| Install the e2e browser (once) | `npx playwright install chromium` |
| Run end-to-end tests | `npm run test:e2e` |
| Run end-to-end tests in the Playwright UI | `npm run test:e2e:ui` |
| Run one e2e file | `npx playwright test e2e/home.spec.ts` |
| Validate `DESIGN.md` | `npm run design:lint` |
| Production build | `npm run build` |
| Serve the production build | `npm start` |

`npm run typecheck` runs `next typegen` first, because Next.js generates the route and layout prop types that `tsc` needs. Plain `tsc --noEmit` fails on a clean checkout.

`npm run test:e2e` starts the dev server itself, or reuses one already on port 3000. With `CI` set it runs `npm start` instead, so run `npm run build` first. CI runs the end-to-end tests as a separate `e2e` job.

There is no formatter configured. ESLint is the only style gate.

The same commands are available as VS Code tasks in `.vscode/tasks.json`. The `verify` task runs lint, typecheck, test and build in sequence.

## Boundaries

**Always**

- Run `npm run lint`, `npm run typecheck`, `npm test` and `npm run build` before calling a change done. CI runs the same four.
- Add or update a test alongside a behaviour change: a unit test for logic and components, an end-to-end test for a flow a guest can see.
- Run `npm run test:e2e` when a change affects a page or a user flow.
- Keep the app runnable from a fresh clone with no external services.
- Read the relevant guide in `node_modules/next/dist/docs/` before using a Next.js API.

**Ask first**

- Adding, removing or upgrading a dependency.
- Changing the database schema or seed data, once they exist.
- Anything in `infra/` or `.github/workflows/`.
- Calling a paid or external service, including AI providers.
- Changing `next.config.ts`, `tsconfig.json` or the ESLint config.
- Re-running BMAD setup, or adding or removing BMAD skills.

**Never**

- Commit secrets, API keys, `.env` files or a local `*.db` file.
- Delete, skip or weaken a failing test to get a green run.
- Add client names, real personal data or internal DVT material. The repo is public.
- Hand-edit the generated and tool-managed paths listed under Project Structure.
- Introduce a separate backend service or a database server.

## Code Style

- Server components by default. Add `"use client"` only where a component needs state, effects or browser APIs.
- Function components with a default export for route files; named exports elsewhere.
- Style with Tailwind utility classes in the markup. No CSS modules or inline `style` objects.
- No `any`. Type component props explicitly.
- Query by role and accessible name in tests, not by test id or class.

```tsx
// src/app/page.tsx
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4">
      <h1 className="text-4xl font-semibold tracking-tight">CheckInn</h1>
    </main>
  );
}
```

```tsx
// src/app/page.test.tsx
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import Home from "./page";

it("renders the CheckInn heading", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { name: "CheckInn" })).toBeInTheDocument();
});
```

## Git and PR Workflow

- Branch from `main`; do not commit to `main` directly. Open a pull request.
- Commit messages follow Conventional Commits: `type(scope): summary` in the imperative, under 72 characters. Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`.

```
feat(search): rank hotels by natural-language query
fix(booking): reject check-out dates before check-in
docs(readme): document the end-to-end test setup
```

- Before opening a PR, all four checks pass locally: lint, typecheck, test, build.
- Keep a PR to one change. Say what changed and how it was verified.
- Git tags named `checkpoint/NN-short-name` mark fixed points in history. Do not move or delete an existing one.

## BMAD

Planning work (PRD, UX, architecture, specs) goes through the BMAD skills, and its output lands in `_bmad-output/`. Ask the `bmad` skill what to do next. BMAD's scripts need `uv` on the PATH.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
