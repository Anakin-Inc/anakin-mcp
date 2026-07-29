# Google ADK integrations catalog — submission instructions

`adk.dev/integrations/` (canonical; `google.github.io/adk-docs/integrations/`
also resolves) is a real, PR-based catalog with an "MCP" filter category.
Process: [`google/adk-docs` CONTRIBUTING.md § Integrations](https://github.com/google/adk-docs/blob/main/CONTRIBUTING.md#integrations).

## Steps (needs the account owner)

1. Fork `google/adk-docs`.
2. Add `anakin.md` (already drafted here) as
   `docs/integrations/anakin.md`.
3. Add a square logo PNG at `docs/integrations/assets/anakin.png` — same
   rasterization blocker as the Cline submission
   (`agent-skills/docs/submissions/cline.md`): no SVG-to-PNG converter was
   available in this sandbox, export `assets/logo-square.svg` from
   `agent-skills` manually before filing.
4. Screenshots are "strongly encouraged" per the guide but not required —
   Anakin has no UI to screenshot (it's an API/MCP server), so this is
   probably skippable; note that in the PR description if asked.
5. Open a PR against `google/adk-docs`.

## Verify against a real example first

Use an existing entry (e.g. their GitHub or Daytona integration page) as a
template check before filing — the exact frontmatter/section structure may
have shifted since this was drafted.

## Not done

Requires the account owner's GitHub identity to fork and PR — nobody has
filed this yet.
