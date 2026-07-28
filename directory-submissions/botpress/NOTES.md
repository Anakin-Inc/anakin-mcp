# Botpress Hub — built

Superseded — this used to flag Botpress as needing real engineering rather
than a manifest, scoped out of the same-day batch. It's built now:
`blueprint-scribe-35/external-integrations/botpress/`. See that directory's
`SUBMIT.md` for what was built, how it was verified (typechecked and built
against the real published `@botpress/sdk`/`@botpress/cli`, a real bug
caught and fixed in the process), and what's still needed (testing inside
an actual bot / the real `botpress/botpress` monorepo — account-owner work,
not code).

Original reasoning for why this is comparable to a Tier 5 bespoke build
rather than a Tier 2 manifest still holds, for context: Botpress Hub has no
generic "connect any MCP server" listing type, so getting listed meant a
second, native implementation of (a subset of) the tool surface in
Botpress's own SDK, not a thin passthrough to the MCP server.
