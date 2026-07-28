---
layout: integration
name: Anakin
description: Web scraping, search, crawling, and deep research for Haystack pipelines via MCP.
authors:
  - name: Anakin
    socials:
      github: Anakin-Inc
      twitter: anakin_io
pypi: null
repo: https://github.com/Anakin-Inc/anakin-mcp
type: Tool Integration
---

Anakin (https://anakin.io) is a hosted MCP server giving Haystack pipelines
structured access to the live web: `scrape`, `map`, `crawl`, AI-native
`search` and multi-source `agentic_search`, pre-built `wire_*` actions across
hundreds of sites, scheduled `monitor_*`, and `browser_task` browser
automation.

```python
from haystack.tools.mcp import MCPTool, StreamableHttpServerInfo

anakin_scrape = MCPTool(
    name="scrape",
    server_info=StreamableHttpServerInfo(url="https://mcp.anakin.io/mcp"),
)
```

Free API key: https://anakin.io/dashboard (300 credits, no card).
