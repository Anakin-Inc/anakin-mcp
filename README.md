# anakin-mcp

[![Node](https://img.shields.io/badge/node-%E2%89%A518-brightgreen.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)
![Status](https://img.shields.io/badge/status-alpha-orange.svg)

[Model Context Protocol](https://modelcontextprotocol.io) server for [Anakin](https://anakin.io).

Gives AI agents in Claude Desktop, Cursor, Windsurf, VS Code, and any other MCP-compatible client native access to web scraping, search, crawling, mapping, agentic research, and Wire actions — without writing any glue code.

> **Status: alpha (v0.1.x).** Tool surface and arguments may change between minor versions until v1.0.

## Quick install (recommended)

One command configures every detected agent client:

```bash
npx anakin-mcp init --all
```

You'll be prompted for your API key (or set `ANAKIN_API_KEY` first to skip the prompt). Get one free at [anakin.io/dashboard](https://anakin.io/dashboard) — 500 credits, no card required.

After it finishes, **restart your agent client(s)**. The `anakin` MCP server will appear in the tool list, exposing six tools (see below).

## Manual install

If you prefer to edit config files yourself, see [Manual setup per client](#manual-setup-per-client).

## What's exposed

| Tool | Purpose |
|---|---|
| `scrape` | Fetch one URL → markdown (or AI-extracted JSON with `generateJson: true`). |
| `search` | AI web search with citations. Synchronous. |
| `map` | Discover all URLs on a domain. |
| `crawl` | Bulk-fetch markdown across a site. |
| `agentic_search` | Multi-source deep research (1–5 min). |
| `wire_action` | Execute pre-built website actions (login flows, form fills, etc.). |

Each tool is a thin wrapper around [`@anakin/sdk`](https://github.com/Anakin-Inc/anakin-node) — there is no scraping logic in this package, just MCP-protocol glue.

## Manual setup per client

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "anakin": {
      "command": "npx",
      "args": ["-y", "anakin-mcp"],
      "env": {
        "ANAKIN_API_KEY": "ak-..."
      }
    }
  }
}
```

Restart Claude Desktop.

### Claude Code (Anthropic CLI)

Edit `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "anakin": {
      "command": "npx",
      "args": ["-y", "anakin-mcp"],
      "env": {
        "ANAKIN_API_KEY": "ak-..."
      }
    }
  }
}
```

Or use Claude Code's built-in command:

```bash
claude mcp add anakin npx -y anakin-mcp -e ANAKIN_API_KEY=ak-...
```

### Cursor

Edit `~/.cursor/mcp.json` (user-scoped) or `./.cursor/mcp.json` (project-scoped):

```json
{
  "mcpServers": {
    "anakin": {
      "command": "npx",
      "args": ["-y", "anakin-mcp"],
      "env": {
        "ANAKIN_API_KEY": "ak-..."
      }
    }
  }
}
```

Restart Cursor.

### Cline (VS Code extension — "Claude Dev")

Edit Cline's settings file inside VS Code's globalStorage:

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` |
| Linux | `~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` |
| Windows | `%APPDATA%/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json` |

```json
{
  "mcpServers": {
    "anakin": {
      "command": "npx",
      "args": ["-y", "anakin-mcp"],
      "env": {
        "ANAKIN_API_KEY": "ak-..."
      }
    }
  }
}
```

Reload the Cline VS Code extension (or restart VS Code).

### Windsurf

Edit `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "anakin": {
      "command": "npx",
      "args": ["-y", "anakin-mcp"],
      "env": {
        "ANAKIN_API_KEY": "ak-..."
      }
    }
  }
}
```

Restart Windsurf.

### VS Code (with the MCP extension)

Edit `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "anakin": {
      "command": "npx",
      "args": ["-y", "anakin-mcp"],
      "env": {
        "ANAKIN_API_KEY": "ak-..."
      }
    }
  }
}
```

Reload VS Code.

## Verify it's working

In Claude Desktop / Cursor / etc., ask the agent something like:

> Scrape https://example.com using anakin and return the markdown.

The agent should call the `scrape` tool, return the page contents, and cite the call in its trace.

## CLI reference

```
anakin-mcp                       Run the MCP server (default — clients spawn this).
anakin-mcp init                  Interactive client config.
anakin-mcp init --all            Configure every detected client, no prompts.
anakin-mcp init --client=cursor  Only configure one client.
anakin-mcp --version             Print version.
anakin-mcp --help                Print usage.
```

## How agents discover Anakin

Two complementary paths:

1. **MCP (this package)** — for clients that support it. Tools are typed and called natively. This is the high-quality path.
2. **[SKILL.md](https://anakin.io/agent-onboarding/SKILL.md)** — for any agent that can fetch a URL. The markdown describes the API end-to-end so an agent can use it via plain HTTP calls.

Most users on Claude Desktop / Cursor / Windsurf / VS Code will want option 1.

## Development

```bash
git clone https://github.com/Anakin-Inc/anakin-mcp.git
cd anakin-mcp
npm install
npm run build
ANAKIN_API_KEY=ak-... node dist/cli.js  # smoke-test the server
```

For local end-to-end testing with an actual MCP client, point the client at the absolute path of `dist/cli.js`:

```json
{
  "mcpServers": {
    "anakin-dev": {
      "command": "node",
      "args": ["/absolute/path/to/anakin-mcp/dist/cli.js"],
      "env": { "ANAKIN_API_KEY": "ak-..." }
    }
  }
}
```

## Related

- [`@anakin/sdk`](https://github.com/Anakin-Inc/anakin-node) — Node.js / TypeScript SDK (used internally by this server)
- [`anakin`](https://github.com/Anakin-Inc/anakin-py) — Python SDK
- [`anakin-cli`](https://github.com/Anakin-Inc/anakin-cli) — Python CLI for human terminal use
- [SKILL.md](https://anakin.io/agent-onboarding/SKILL.md) — agent-onboarding doc for non-MCP agents

## License

[Apache 2.0](LICENSE)
