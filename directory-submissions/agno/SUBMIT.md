# Agno cookbook — submission instructions

Agno's official repo has real precedent for named third-party MCP servers as
short example scripts under `cookbook/91_tools/mcp/` (e.g. `stripe.py`,
`supabase.py`, `notion_mcp_agent.py`, `qdrant.py`). This gets Anakin named in
Agno's official examples — not the same as the marketed "100+ toolkits"
count, which requires a heavier native `Toolkit` subclass instead (see
`CONTRIBUTING.md` § "Adding a new Tool" if that's ever worth pursuing).

## Steps (needs the account owner)

1. Fork `agno-agi/agno`.
2. Add `anakin.py` (already drafted here) as
   `cookbook/91_tools/mcp/anakin.py` — style-matched to the existing
   `stripe.py`/`supabase.py` examples in that directory, but **check those
   two files directly first** and adjust `anakin.py` to match their exact
   conventions (imports, docstring format, `if __name__` block) since this
   was written from the pattern description, not a byte-for-byte copy of an
   existing file.
3. Run the repo's format/validate scripts per `CONTRIBUTING.md`.
4. Open a PR tagged `[cookbook]` per their PR-title lint rule.

## Not done

Requires the account owner's GitHub identity to fork and PR, and a final
pass matching the two sibling example files' exact style — nobody has filed
this yet.
