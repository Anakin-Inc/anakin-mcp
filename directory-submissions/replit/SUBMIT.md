# Replit — submission instructions

Reclassified out of Tier 1's client-config-snippet pattern: Replit doesn't
support arbitrary local stdio MCP servers at all (`npx -y @anakin-io/mcp`
cannot ship here) — every registration path needs a remote HTTPS endpoint.
We already have one: `mcp.anakin.io` (Streamable HTTP, OAuth 2.1, live in
production — verified 2026-07-27 by hitting
`https://anakin.io/.well-known/oauth-authorization-server` and getting a
proper `401` challenge on unauthenticated `POST /mcp`). So this needs no new
server, just registering the existing one.

## Two registration paths

**1. Integrations pane** (curated list, no public submission process found —
manual paste only): in Replit, **Integrations** → **+ Add MCP server** →
paste `https://mcp.anakin.io/mcp` as the endpoint. Whether Replit's client
completes the OAuth 2.1 authorization-code flow automatically (our server
publishes RFC 9728 protected-resource metadata specifically so compliant
clients can discover it) or only supports static header-based auth isn't
confirmed from the docs — worth a manual test before documenting this as the
primary path for users.

**2. Install-link / badge** — self-service, no Replit review needed. The
scheme is `replit.com/integrations?mcp=<base64-encoded-JSON>` where the JSON
is `{"displayName", "baseUrl", "headers": [...]}`. Generated and verified
the encoding round-trips correctly:

```
https://replit.com/integrations?mcp=eyJkaXNwbGF5TmFtZSI6IkFuYWtpbiIsImJhc2VVcmwiOiJodHRwczovL21jcC5hbmFraW4uaW8vbWNwIiwiaGVhZGVycyI6W119
```

Decodes to:
```json
{"displayName": "Anakin", "baseUrl": "https://mcp.anakin.io/mcp", "headers": []}
```

An empty `headers` array assumes Replit's client handles the OAuth flow
itself via the server's protected-resource metadata. If Replit only
supports static headers (no OAuth), this link needs a different shape —
untested against a live Replit account, flagging rather than guessing.

## Not done

The install-link URL is generated and ready to use/embed (e.g. an "Add to
Replit" button on anakin.io), but nobody has clicked it against a live
Replit account to confirm the OAuth-vs-static-header question above.
