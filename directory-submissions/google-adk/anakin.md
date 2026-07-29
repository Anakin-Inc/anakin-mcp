---
catalog_title: Anakin
catalog_description: Web scraping, search, crawling, and deep research for ADK agents via MCP.
catalog_icon: assets/anakin.png
---

# Anakin

[Anakin](https://anakin.io) gives ADK agents structured access to the live
web over a hosted MCP server — no scraper to write or maintain.

## Use cases

- Turn any URL into clean markdown or structured JSON for an agent to reason
  over (`scrape`), or pull whole sites (`map`, `crawl`).
- AI-native web search and multi-source deep research (`search`,
  `agentic_search`) for agents that need current information beyond their
  training data.
- Pre-built read/write actions across hundreds of popular websites
  (`wire_*`) — structured data extraction without per-site scraping code.
- Scheduled change monitoring with webhook/email alerts (`monitor_*`).
- Natural-language-driven browser automation for multi-step tasks a plain
  scrape can't reach (`browser_task`).

## Prerequisites

A free Anakin API key — [anakin.io/dashboard](https://anakin.io/dashboard),
300 credits, no card required.

## Install

Anakin is a remote MCP server (Streamable HTTP, OAuth 2.1) — connect an ADK
agent to it via `MCPToolset`:

```python
from google.adk.agents import Agent
from google.adk.tools.mcp_tool import MCPToolset, StreamableHTTPConnectionParams

anakin_tools = MCPToolset(
    connection_params=StreamableHTTPConnectionParams(
        url="https://mcp.anakin.io/mcp",
    ),
)

agent = Agent(
    name="web_research_agent",
    model="gemini-2.5-flash",
    tools=[anakin_tools],
)
```

On first use, ADK's MCP client handles the OAuth 2.1 authorization-code flow
against Anakin's authorization server; the agent's user authenticates once
and Anakin mints a scoped, revocable key for that connection.

## Available tools

| Tool | What it does |
|---|---|
| `scrape` | Fetch one URL as clean markdown or structured JSON |
| `map` | List a site's URLs |
| `crawl` | Fetch many pages from a site at once |
| `search` | Web search |
| `agentic_search` | Multi-source deep research |
| `wire_discover`, `wire_catalog` | Find pre-built actions available for a site |
| `wire_read_action` | Run a read action (e.g. get a product price) |
| `wire_write_action` | Run a write action on the user's own connected account |
| `wire_identities`, `wire_login`, `wire_build` | Manage saved logins; build new Wire actions |
| `monitor_create`, `monitor_list`, `monitor_changes`, `monitor_control` | Schedule and manage change monitors |
| `ai_visibility_search`, `ai_visibility_sources` | Compare what AI answer engines say about a topic |
| `session_list`, `session_delete` | Manage saved browser sessions |
| `browser_task` | Drive a real cloud browser from natural language |

## Links

- [Documentation](https://anakin.io/docs)
- [Source (`@anakin-io/mcp`)](https://github.com/Anakin-Inc/anakin-mcp)
- [Pricing](https://anakin.io/pricing)
