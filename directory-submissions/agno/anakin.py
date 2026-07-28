"""Use Anakin's MCP server for web scraping, search, and deep research.

Anakin (https://anakin.io) is a hosted MCP server (Streamable HTTP, OAuth
2.1) giving agents structured access to the live web: scrape any URL to
clean markdown or JSON, run AI-native search and multi-source deep research,
execute pre-built read/write actions across hundreds of popular sites,
monitor pages for changes, and drive a real cloud browser from natural
language.

Get a free API key at https://anakin.io/dashboard (300 credits, no card).
"""

import asyncio

from agno.agent import Agent
from agno.tools.mcp import MCPTools


async def run_agent(message: str) -> None:
    async with MCPTools(
        url="https://mcp.anakin.io/mcp",
        transport="streamable-http",
    ) as anakin_tools:
        agent = Agent(
            tools=[anakin_tools],
            markdown=True,
        )
        await agent.aprint_response(message, stream=True)


if __name__ == "__main__":
    asyncio.run(
        run_agent(
            "Scrape https://anakin.io/pricing and summarize the plans as a table."
        )
    )
