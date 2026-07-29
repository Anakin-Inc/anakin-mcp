# Docker MCP Catalog — submission instructions

Feeds both the Docker Hub MCP catalog and Docker Desktop's MCP Toolkit.
Repo: [github.com/docker/mcp-registry](https://github.com/docker/mcp-registry),
process in its `CONTRIBUTING.md`.

Don't confuse this with `docker/mcp-community-registry` (a separate mirror of
the official MCP Registry) — that one does not feed Docker Hub/Desktop.

## Steps (needs the account owner)

1. Fork `docker/mcp-registry`.
2. Add this directory as `servers/anakin/` in the fork — `server.yaml`,
   `tools.json`, `readme.md` are already drafted here, ready to copy over.
3. Open a PR. Since this is a remote server (not a container Docker needs to
   build/sign), there's nothing else to build — the PR just registers the
   `server.yaml` pointing at our already-hosted `https://mcp.anakin.io/mcp`.
4. Per the repo's docs, approved PRs appear in the catalog within ~24 hours.

## Before filing

`server.yaml`'s OAuth URLs were verified live against
`https://anakin.io/.well-known/oauth-authorization-server` on 2026-07-27 — if
much time has passed since, re-check that endpoint hasn't changed before
submitting.

## Not done

Requires forking an external repo and opening a PR under the account owner's
GitHub identity — nobody has filed this yet.
