# CheckInn

A simple hotel-booking system, and the demo application for DVT's AI-SDLC workshop at AI Africa.

The workshop takes this system and, live, runs one enhancement through an AI-assisted software lifecycle: requirements, UX, architecture, build and deploy. The enhancement adds intelligent, natural-language search to hotel booking. See [docs/workshop](docs/workshop/README.md) for the agenda.

> **Status:** project shell. The app is a placeholder page. The booking system itself has not been built yet.

## Getting started

You need Node.js 24 (see `.nvmrc`).

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm test` | Unit tests (Vitest) |
| `npm run build` | Production build |

In VS Code, the same commands are available under **Tasks: Run Task** (`verify` runs all four checks), and the Run and Debug panel has configurations for debugging the server, the browser, both together, and the current test file.

## Stack

Next.js, React, TypeScript and Tailwind CSS, with SQLite planned for data. CI runs on GitHub Actions and the deployment target is Azure.

## Repository map

| Path | Contents |
|---|---|
| `src/app/` | The Next.js application |
| `docs/workshop/` | Workshop agenda, roles and checkpoints |
| `infra/` | Infrastructure as code (placeholder) |
| `_bmad/`, `.claude/skills/`, `.agents/skills/` | [BMAD Method](https://github.com/bmad-code-org/BMAD-METHOD) configuration and skills |
| `AGENTS.md` | Instructions for AI coding agents working in this repo |

## Working with the AI agents

The repo is set up for [Claude Code](https://claude.com/claude-code) with the BMAD Method skills installed. BMAD's scripts need [uv](https://docs.astral.sh/uv/). Open the repo in Claude Code and ask `bmad` what to do next.
