# Smithery — submission instructions

Smithery (smithery.ai) lists MCP servers from a public HTTPS URL directly —
no manifest file needed for a remote server like ours. This is the cheapest
listing on the board; do it first.

## Steps (needs the account owner)

**Web:**
1. Go to [smithery.ai/new](https://smithery.ai/new).
2. Enter `https://mcp.anakin.io/mcp`.
3. Smithery scans `tools/list` and OAuth metadata automatically and builds
   the listing from that — no separate config to write.

**CLI, equivalent:**
```
npm install -g @smithery/cli
smithery auth login
smithery mcp publish https://mcp.anakin.io/mcp -n anakin-io/anakin
```

## Optional: control what Smithery shows

If the auto-scanned tool list/description isn't what we want surfaced,
Smithery supports a `/.well-known/mcp/server-card.json` endpoint on the
server itself that overrides the scan. Not required for a first listing —
only worth building if the auto-generated page needs correcting after it's
live.

## Not done

Requires `smithery auth login`, which needs the account owner's identity —
nobody has run this yet.
