- source_plan: `_bmad-output/initiative-checkinn-mvp/epic-checkinn-mvp/story-app-shell-design-tokens-and-error-pages-plan.md`
  summary: The placeholder Home section in src/app/page.tsx still uses default Tailwind sizes (text-4xl, text-lg, gap-4, px-6, max-w-md) instead of DESIGN.md tokens, so its heading never switches to the mobile size.
  evidence: Pre-existing classes kept by story 1 (only the element tag changed); the Home rebuild in story 2 should use text-headline-*-responsive, px-gutter and gap-space-* tokens.
