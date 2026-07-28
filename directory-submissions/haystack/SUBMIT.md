# Haystack integrations — submission instructions (speculative)

**Confidence: low.** `deepset-ai/haystack-integrations` has exactly one
existing MCP-related entry, `integrations/mcp.md` — a generic listing for
the `mcp-haystack` package itself (the protocol support), not a per-vendor
directory. There's no established precedent of individual remote MCP servers
(e.g. a hypothetical "Stripe MCP" or "Notion MCP") getting their own entry
here. A PR may get questioned as out of scope for this repo.

## If filing anyway

1. Fork `deepset-ai/haystack-integrations`.
2. Add `anakin.md` (drafted here) as `integrations/anakin.md`, following the
   repo's `draft-integration.md` template — check that template directly
   before filing, this was written from the documented required frontmatter
   fields (`layout`, `name`, `description`, `authors`, `type`, plus one of
   `pypi`/`repo`), not copied from a live per-vendor example (none exists).
3. Open a PR; expect maintainers to ask why this isn't just a usage example
   in Anakin's own docs instead of a listing here. Have an answer ready —
   or reconsider filing this one at all.

## Not done

Speculative — lower priority than the confirmed mechanisms (Smithery,
Docker, Google ADK, Agno). Not filed.
