# Contributing to CheckInn

Thanks for helping out. This page is the short version. [`AGENTS.md`](../AGENTS.md) is the full reference for the stack, the code style and what needs asking first, and it applies to people as much as to AI agents.

## Set up

You need Node.js 24 (see [`.nvmrc`](../.nvmrc)).

```bash
npm install
npm run dev
```

## Make a change

1. Branch from `main`. Do not commit to `main` directly.
2. Keep the change small and readable. Guest-facing behaviour comes first.
3. Add or update a test alongside a behaviour change: a unit test for logic and components, an end-to-end test for a flow a guest can see.
4. Run the checks below.
5. Open a pull request.

## Checks

All four must pass before a pull request is opened. CI runs the same four.

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

If the change affects a page or a user flow, also run the end-to-end tests:

```bash
npm run test:e2e
```

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/): `type(scope): summary` in the imperative, under 72 characters. Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`.

```
feat(search): rank hotels by natural-language query
fix(booking): reject check-out dates before check-in
docs(readme): document the end-to-end test setup
```

## Pull requests

- Keep a pull request to one change.
- Say what changed and how it was verified.
- Ask before adding a dependency, or changing `infra/`, `.github/workflows/`, `next.config.ts`, `tsconfig.json` or the ESLint config.

## What not to commit

The repo is public. Do not commit secrets, API keys, `.env` files, a local `*.db` file, client names or real personal data.

## Licence

By contributing, you agree that your contribution is released under the [MIT License](../LICENSE).
