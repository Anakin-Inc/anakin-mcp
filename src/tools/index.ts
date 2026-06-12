/**
 * Tool registry — single source of truth for what the MCP server exposes.
 *
 * Each tool has a JSON Schema (advertised to the client so it can validate
 * arguments) and a handler that calls into AnakinClient. The handler
 * returns a string payload wrapped in MCP's content envelope.
 */

import type { AnakinClient } from '../client.js'

import { scrapeTool } from './scrape.js'
import { searchTool } from './search.js'
import { mapTool } from './map.js'
import { crawlTool } from './crawl.js'
import { agenticSearchTool } from './agentic-search.js'
import { wireTools } from './wire.js'

export interface ToolContent {
  content: Array<{ type: 'text'; text: string }>
  isError?: boolean
  // MCP's CallToolResult schema declares an index signature for forward
  // compatibility with future fields. Mirroring it here keeps assignment
  // to CallToolResult clean.
  [key: string]: unknown
}

export interface AnakinTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  handler: (
    client: AnakinClient,
    args: Record<string, unknown>,
  ) => Promise<ToolContent>
}

export const tools: AnakinTool[] = [
  scrapeTool,
  searchTool,
  mapTool,
  crawlTool,
  agenticSearchTool,
  ...wireTools,
]

const byName: Record<string, AnakinTool> = Object.fromEntries(
  tools.map((t) => [t.name, t]),
)

export async function dispatchTool(
  client: AnakinClient,
  name: string,
  args: Record<string, unknown>,
): Promise<ToolContent> {
  const tool = byName[name]
  if (!tool) {
    return {
      isError: true,
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
    }
  }

  try {
    return await tool.handler(client, args)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return {
      isError: true,
      content: [{ type: 'text', text: `Tool '${name}' failed: ${message}` }],
    }
  }
}

/** Helper to wrap a string result in MCP's content envelope. */
export function ok(text: string): ToolContent {
  return { content: [{ type: 'text', text }] }
}

/** Helper to JSON-stringify a result for tool output. */
export function okJson(value: unknown): ToolContent {
  return ok(JSON.stringify(value, null, 2))
}
