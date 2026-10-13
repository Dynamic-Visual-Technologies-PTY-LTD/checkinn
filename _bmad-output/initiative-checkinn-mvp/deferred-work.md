- source_plan: `_bmad-output/initiative-checkinn-mvp/epic-checkinn-mvp/story-app-shell-design-tokens-and-error-pages-plan.md`
  summary: The placeholder Home section in src/app/page.tsx still uses default Tailwind sizes (text-4xl, text-lg, gap-4, px-6, max-w-md) instead of DESIGN.md tokens, so its heading never switches to the mobile size.
  evidence: Pre-existing classes kept by story 1 (only the element tag changed); the Home rebuild in story 2 should use text-headline-*-responsive, px-gutter and gap-space-* tokens.
- source_plan: `_bmad-output/initiative-checkinn-mvp/epic-checkinn-mvp/story-tracer-database-seed-and-home-city-tiles-plan.md`
  summary: Update AGENTS.md now that the data stack is installed (current state, stack table, project structure, `db:generate` command).
  evidence: AGENTS.md still says "no database" and lists SQLite, Drizzle and better-sqlite3 as "not installed yet", while story 2 installs them and adds `src/db/`, `src/features/`, `drizzle/` and `data/seed/`. Agent-context edits are deferred rather than patched.
- source_plan: `_bmad-output/initiative-checkinn-mvp/epic-checkinn-mvp/story-range-calendar-occupancy-picker-and-dialog-primitive-plan.md`
  summary: The two-month Dates popover (~690px wide, `absolute left-0`) can overflow the viewport at tablet widths once placed after Destination in the search bar.
  evidence: Unverified (medium if true): nothing renders the field yet; story 5 sets the bar layout. Settle by checking `/` at 768–1023px after story 5 and, if it overflows, align the popover to the field end or clamp it.
