# Infrastructure

Placeholder. No infrastructure code exists yet.

| | |
|---|---|
| Target cloud | Azure |
| Owner | Mohammed, once the base application is ready |
| CI/CD | GitHub Actions |

## Open decisions

- **Bicep or Terraform.** Not decided. Either is fine for a deployment this small.
- **Hosting service.** To be chosen in the architecture step. The app is a single Next.js process with an embedded SQLite file, so whatever is chosen needs a persistent disk or the database has to be seeded at start-up.
- **Environments.** Likely a single demo environment.

Once these are settled, the IaC goes in this folder and a deploy workflow is added next to `.github/workflows/ci.yml`.
