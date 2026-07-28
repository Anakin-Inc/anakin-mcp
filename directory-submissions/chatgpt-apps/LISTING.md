# ChatGPT App Directory — submission packet (DRAFT)

Third-party MCP servers can be submitted to the ChatGPT App directory since
OpenAI opened this up in 2026. Self-serve, but full human review — not
instant. Submit at
[platform.openai.com/apps-manage](https://platform.openai.com/apps-manage);
guidelines at
[developers.openai.com/apps-sdk/app-submission-guidelines](https://developers.openai.com/apps-sdk/app-submission-guidelines).

This is the heaviest submission on the board — closer in shape to the
existing [Claude Connectors Directory packet](../../../anakin-mcp-remote/compliance/LISTING.md)
than to the light PR-based ones (Docker, ADK, Agno). Reuse that packet's
metadata directly; the sections below are OpenAI-specific requirements on
top of it.

## Blocking on

1. ~~**Domain-ownership challenge endpoint.**~~ **Done 2026-07-27.**
   `GET /.well-known/openai-apps-challenge` is live in `anakin-mcp-remote`
   (`src/server.ts`), gated behind `OPENAI_APP_VERIFICATION_TOKEN` — 404s
   until that env var is set (fails loudly, matches this repo's existing
   `${VAR}`-placeholder convention rather than serving a wrong/empty token),
   200s with the token as plain text once it is. Covered by
   `tests/server.test.ts` (both the 404-when-unset and 200-with-token
   cases; full suite green, 68/68). **Still needs**: the actual token value
   from OpenAI (only obtainable by starting the submission in their
   dashboard) set as that env var in the deployment.
2. **Demo credentials for reviewers.** OpenAI requires a full-featured demo
   account with no 2FA/signup gate. Needs an actual test account provisioned
   on Anakin's side — an operational task for whoever owns account
   provisioning, not something drafted here.

## Reused from the Claude packet

- **Description, use cases, example prompts:** same content as
  `anakin-mcp-remote/compliance/LISTING.md` — the tool surface and value
  prop don't change per platform.
- **Privacy policy / ToS URLs:** `https://anakin.io/privacy`,
  `https://anakin.io/terms` — already live (referenced in every platform
  manifest's `interface` block across `agent-skills`).
- **Server URL / transport:** `https://mcp.anakin.io/mcp`, Streamable HTTP,
  OAuth 2.1 — same connection as Claude uses, verified live 2026-07-27.

## OpenAI-specific requirements

- **Every tool needs `annotations`** with `readOnlyHint`, `destructiveHint`,
  `openWorldHint` set correctly — flagged by OpenAI's own guidelines as the
  most common rejection cause. The Claude packet already classifies all 21
  tools into 14 read-only / 7 destructive
  (`anakin-mcp-remote/compliance/LISTING.md` § "Tools & annotations") — the
  `readOnlyHint`/`destructiveHint` values map directly. `openWorldHint`
  isn't part of Claude's classification and needs adding: true for anything
  touching the open web (`scrape`, `search`, `map`, `crawl`,
  `agentic_search`, `wire_*`, `browser_task`, `ai_visibility_*`), false for
  the ones scoped to Anakin's own account state (`monitor_*`, `session_*`).
- **App icons**, light and dark mode variants — `agent-skills/assets/` has
  `logo.svg` and `logo-square.svg` (opaque background plate) but no
  dark-mode variant and no rasterized PNGs — same SVG-to-PNG blocker noted
  in the Cline and Google ADK submissions, compounded here by needing a
  second (dark) variant that doesn't exist yet at all.
- **App name/description:** must not be generic/single-word — "Anakin" on
  its own may need a qualifier; check current guidelines at submission time
  since this is explicitly called out as a common rejection reason.
- **Business/identity verification** on the OpenAI Platform developer
  account — an account-level step for whoever submits, unrelated to this
  repo.

## Not done

One engineering blocker down (the challenge endpoint), two left: the demo
account (operational, not code) and the dark-mode icon (design). Once
OpenAI issues a verification token, setting
`OPENAI_APP_VERIFICATION_TOKEN` and redeploying `anakin-mcp-remote` is all
the remaining code-side work — everything else from here is account
provisioning and a design asset.
