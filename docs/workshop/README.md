# AI Africa: AI-SDLC workshop

A 90-minute, presenter-driven session for roughly 200 attendees. The presenters drive the build on one laptop; the audience watches and makes choices, they do not type along.

The session takes an existing hotel-booking system (this repo), shows what its users are unhappy about, and then runs one enhancement through the full AI-assisted lifecycle: requirements, UX, architecture, build, deploy.

## Roles

| Person | Role in the session |
|---|---|
| Kevin | Narrator and facilitator. Introduces each role and the handover between them. |
| Richard | Product |
| Mohammed | UX |
| Lonwabo | Architecture |

Each role hands over to the next, relay style, so the audience sees the separation of responsibilities rather than one person doing everything.

## Agenda

1. Present the workflow and the AI-SDLC we follow.
2. Show the existing hotel-booking system and establish the problem statement.
3. Present user-feedback bubbles highlighting what users say is not working.
4. Show how the solution specification is developed across the PRD, UX and architecture.
5. Checkpoint after each section.
6. The audience chooses from a set of options that changes a requirement.
7. Run the build, with the option to switch to a prebuilt solution if time is limited.
8. Deploy and demonstrate the solution.

## The enhancement

The starting point is a simple hotel-booking system. The enhancement adds RAG to the booking search: a guest describes what they are looking for in plain language and the results are ranked by how well they match.

On stage this is called "intelligent search" rather than RAG. Most of the room is non-technical and cares about the outcome.

The audience choice in step 6 is a variation on this one feature (for example, how ranking should behave), picked from options we prepare in advance. It is not a choice between different features.

## Tech stack

| Area | Choice |
|---|---|
| Source control and CI/CD | GitHub and GitHub Actions |
| AI coding tool | Claude Code |
| Method | BMAD (agent personas) |
| Application | Next.js, full stack, no separate API |
| Database | SQLite |
| Cloud | Azure |
| Infrastructure as code | Bicep or Terraform, undecided |

## Checkpoints

Every agenda section that changes the repo ends with a git tag, so the presenters can jump to a known-good state if the live build is slow or the network fails.

Convention: `checkpoint/NN-short-name`, numbered in agenda order.

| Tag | State of the repo |
|---|---|
| `checkpoint/01-base` | Existing booking system, before any enhancement |
| `checkpoint/02-prd` | PRD written |
| `checkpoint/03-ux` | UX specification written |
| `checkpoint/04-architecture` | Architecture written |
| `checkpoint/05-built` | Enhancement implemented (the prebuilt fallback) |
| `checkpoint/06-deployed` | Deployed and demo-ready |

None of these tags exist yet. They are created as each stage is rehearsed.

## Open items

- Bicep or Terraform.
- The exact set of options offered to the audience in step 6.
- The feature list of the base booking system.
- A script per presenter, cross-checked so the handovers are coherent.
- Slides.
- Network: the build depends on a reliable connection, so a dedicated presenter network needs confirming with the venue.
