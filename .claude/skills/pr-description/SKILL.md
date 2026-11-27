---
name: pr-description
description: Write a reviewer-ready pull request description for CheckInn, with Playwright screenshots of the changed pages, an Archify diagram for major functional changes, a suggested review order, what to look out for and how to verify. Use whenever the user asks to open, create, raise or update a PR, write or improve a PR description, or "get this ready for review", even if they don't mention screenshots or diagrams.
---

# PR description

A reviewer should be able to understand the change, see it, know where the risk is and check it, without checking out the branch first. Everything below serves that.

The flow: read the change, decide what visuals it needs, capture them, draft the body, show the user, and only then commit images, push and create or edit the PR.

## 1. Read the change

Work out the range: normally `main...HEAD` on the current branch, but use the base or commits the user names if they give some. Then gather:

- `git log --oneline <base>..<head>` and `git diff --stat <base>...<head>`, then read the diff itself. Describe what the code does, not what the commit messages claim.
- `gh pr view --json number,title,body,url` to see whether a PR already exists. If it does, you are updating its body; keep anything a human wrote that is still true.
- The ticket, if one is named in the branch, commits or conversation: its plan in `_bmad-output/initiative-checkinn-mvp/` gives the intent and acceptance criteria to verify against.
- `.github/pull_request_template.md`. Its headings and checklist stay in the body.

## 2. Decide which visuals it needs

**Screenshots** when a guest can see the change: anything under `src/app/` or `src/components/` that renders, styling, `DESIGN.md`, copy, or a flow change. Skip them for docs, CI, infra, test-only or pure refactor changes, and say in the body that nothing visible changed.

**An Archify diagram** when the change is major and functional, meaning a reviewer would otherwise have to hold the shape of it in their head. Typical signs:

- a new route, page, server action or route handler
- a new or changed guest journey (search, Hotel page, rooms, booking, manage, cancel)
- a schema or migration change, or new data moving between layers
- a change that cuts across `src/app`, `src/features` and `src/domain` together
- new infrastructure or a new external boundary

A styling change, a bug fix inside one function, or copy edits are not major; a diagram there is noise. When unsure, ask the user in one line.

## 3. Capture Playwright screenshots

The script runs the repo's Playwright setup (production build on port 3100, temporary database) and has two ways to capture:

- `--page <path>`: a full-page screenshot of that page on desktop and phone, with photos loaded. This is usually what a reviewer wants: the whole changed page in one image. Use it for every page whose look changed.
- Spec files: every test leaves a screenshot of its final state. Useful when a test happens to end on the changed state. These are viewport-only, and many specs block photos, so tiles and galleries show placeholders.
- A temporary capture spec, for states in the middle of a flow (an open dialog, an error, a confirmation, a cancelled Booking). Write it as `e2e/<name>.tmp.spec.ts`, or `e2e/booking/<name>.tmp.spec.ts` if it creates or cancels Bookings (gitignored either way), reusing the helpers in `e2e/support/` (`uniqueGuestEmail()`, the `bookingStay` slots) so it doesn't fight the real specs. At each state, wait for it to settle (the element visible, then about 500 ms for transitions; a dialog caught mid-fade looks broken), then save into the folder the script provides:

  ```ts
  await page.screenshot({ path: `${process.env.PR_CAPTURE_DIR}/${testInfo.project.name}--cancel-dialog.png`, fullPage: true });
  ```

  Pass it to the script like any spec, and delete it afterwards.

Pick pages from the routes the diff touches, and specs from `e2e/` that drive the changed states (new or edited specs first). Run from the repo root in the foreground with a long timeout (10 minutes; the first run builds the app):

```bash
MSYS_NO_PATHCONV=1 node .claude/skills/pr-description/scripts/capture-e2e.mjs --out .pr-description/e2e --page / --page "search?destination=Durban" e2e/manage.spec.ts
```

`MSYS_NO_PATHCONV=1` stops Git Bash rewriting `/` into a Windows path (not needed in PowerShell). Once a build of the current code exists, prefix `CI=1` to skip rebuilding on reruns. The script picks the projects itself (desktop and a capture-only phone project for pages, `chromium` for read-only specs, `smart` for `e2e/smart/` specs and `booking` for `e2e/booking/` specs; the e2e suite itself is desktop only) and skips their dependencies, so only the files you name run. Override with `--project`, and pass Playwright args after `--` (for example `-- --grep "photo viewer"`).

It prints the pass/fail counts and failing tests, and writes `screens/*.png` (named `<project>--<spec or page>.png`) plus a `manifest.json`. The printed summary is usually enough; the manifest lists every test and is large, and a pass there is `"expected"`.

Look at the candidate screenshots with the Read tool and choose 2 to 6 that show the change, ideally the same page on desktop and phone. A final state that doesn't show the change (say, after a cancel) is not worth including.

If no spec reaches the changed state, the change is missing an end-to-end test, which AGENTS.md requires for a flow a guest can see. Tell the user rather than quietly leaving the section out.

If tests fail, report the failures in the body as they are. Never drop or skip a failing test to get clean screenshots.

## 4. Draw the Archify diagram (major changes only)

Use the `archify` skill, repository-backed, scoped to this change: the flow or structure the PR adds or alters, with the new and changed parts named as such in labels (for example "new: cancelBooking action"). Pick the type from what the reviewer needs: `sequence` for a request or user journey through server actions and the database, `workflow` for a guest flow with branches, `architecture` for new parts and boundaries, `erd` for a schema change. Put Archify's working folder under `.pr-description/archify/`.

After `finalize` passes, render images with:

```bash
node <archify>/bin/archify.mjs visual-check <diagram.html> --summary --require-provenance --out-dir .pr-description/archify/capture
```

Look at the captured PNGs and use a light one that shows the whole diagram: the 1440×900 capture for a wide diagram, the 2048×1320 one when a tall diagram (a long sequence, say) is clipped at 1440×900. Read it yourself before using it: a cramped or clipped diagram helps nobody, so repair it through Archify first. Archify's own diagnostics usually point at the fix (spacing, overlapping notes); expect one or two quick `finalize` repairs.

If the `archify` skill is not installed, say so to the user and use a small Mermaid diagram in the body instead; GitHub renders Mermaid natively.

## 5. Draft the body

Write it to `.pr-description/body.md`. Reference images by repo path, `docs/pr-assets/<file>.png`; step 6 turns them into links. Name image files `<short-change-name>-<what>-<desktop|phone>.png` (from the branch name when there is one) so they make sense on their own.

For "How it was verified", run `npm run lint`, `npm run typecheck` and `npm test` yourself unless they already ran on this code in the session; they take a minute and reviewers rely on the result. The capture run counts as the end-to-end run for the specs it ran; say which specs, since that is not the full `npm run test:e2e`. It counts as `npm run build` only if it built; a `CI=1` run reused an existing build, so don't claim one.

Use this shape. Drop a section that has nothing true to say rather than padding it.

```markdown
<One or two sentences: what a guest or developer can now do or see, and why. Link the ticket.>

## What changed

- **<Area>:** <what changed, in plain words, with the key file as a link>
- ...

## Screenshots

| Desktop | Phone |
|---|---|
| <img src="docs/pr-assets/x-desktop.png" width="480"> | <img src="docs/pr-assets/x-phone.png" width="240"> |

<One line per row saying what state it shows, if not obvious. A state worth showing on one viewport only goes in its own small table with headings that name the states.>

## How it fits together

![<what the diagram shows>](docs/pr-assets/x-diagram.png)

<Two or three sentences: how to read it, what is new.>

## Reviewing this PR

**Suggested order:** <files or areas in the order that makes the diff easiest to follow, for example domain rules, then the repo/action, then the page>.

**Look out for:**
- <the real risks: edge cases, behaviour that changed on purpose, assumptions, anything subtle in the diff>

**Out of scope:** <what was deliberately left alone, so the reviewer doesn't ask>

## How to verify

1. `npm install && npm run db:reset && npm run dev`
2. Open <exact URL>, do <exact steps with seed data, such as a city or hotel name>, and expect <exact result>.
3. ...

## How it was verified

- `npm run lint`, `npm run typecheck`, `npm test` (<N> passed), `npm run build`: <result>
- `npm run test:e2e`: <N passed, N failed, N skipped>, or the specs the capture ran and their counts
- <anything checked by hand>

## Checklist

<the template's checklist, ticked only for what was actually run>

💡Ideated By Humans - 🤖Generated with [Claude Code](https://claude.com/claude-code)
```

The last line is the repo's PR tagline (AGENTS.md, Git and PR Workflow). It replaces the default "🤖 Generated with Claude Code" line; don't add both.

How to write it, matching the PRs already merged here:

- Plain and factual. Short sentences, no hype, no "This PR...", no emoji.
- Specific over general: name the page, the field, the rule, the test. "Rejects a check-out before check-in" beats "improves validation".
- "Look out for" is the most valuable section and the hardest. Base it on the diff: what changed behaviour, what a wrong assumption would break, where a reviewer's eye should slow down. If the change is genuinely low-risk, say so in one line.
- Verification steps must work on a fresh clone with the seed data. Read `data/seed/hotel-booking-demo.json` for real city and hotel names rather than guessing.
- Only claim checks that ran. If you didn't run something, say so.
- No secrets, real personal data or internal material: the repo is public. Screenshots come from seed data and `uniqueGuestEmail()` guests, so they are safe; check anyway.

## 6. Show the user, then publish

Show the user the draft (link `.pr-description/body.md` and the chosen images) and ask with AskUserQuestion whether to publish. Committing, pushing and posting are outward-facing, so wait for a yes.

On a yes:

1. Replace the images folder: `git rm -r --quiet --ignore-unmatch docs/pr-assets`, then copy the chosen PNGs into a fresh `docs/pr-assets/`. The folder only ever holds the latest PR's images; older PR descriptions stay intact because their links are pinned to their own commit.
2. Commit only that folder: `git add docs/pr-assets && git commit -m "docs(pr): update review images"`, then push the branch.
3. Run `node .claude/skills/pr-description/scripts/link-assets.mjs .pr-description/body.md`. It rewrites each `docs/pr-assets/...` reference to a `github.com/<owner>/<repo>/blob/<sha>/...?raw=true` link pinned to the pushed commit, and refuses if HEAD isn't pushed or an image is missing.
4. `gh pr create --base main --title "<conventional commit title>" --body-file .pr-description/body.md`, or `gh pr edit <n> --body-file .pr-description/body.md` for an existing PR. The title follows the repo's Conventional Commits rule: `type(scope): summary`, under 72 characters.
5. Check one image URL returns 200 (`curl -sI -L <url>`), and give the user the PR link.

`.pr-description/` is gitignored scratch; leave it for the next run to overwrite.
