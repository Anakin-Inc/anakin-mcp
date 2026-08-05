/**
 * Tool registry — single source of truth for what the MCP server exposes.
 *
 * Each tool has a JSON Schema (advertised to the client so it can validate
 * arguments) and a handler that calls into AnakinClient. The handler
 * returns a string payload wrapped in MCP's content envelope.
 *
 * Transport-agnostic — kept in sync with `anakin-mcp-remote/src/tools/index.ts`.
 */

import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js'

import type { AnakinClient } from '../client.js'

import { scrapeTool } from './scrape.js'
import { searchTool } from './search.js'
import { mapTool } from './map.js'
import { crawlTool } from './crawl.js'
import { agenticSearchTool } from './agentic-search.js'
import { wireTools } from './wire.js'
import { monitorTools } from './monitor.js'
import { aiVisibilityTools } from './ai-visibility.js'
import { sessionTools } from './sessions.js'
import { browserTaskTool } from './browser-task.js'

export interface ToolContent {
  content: Array<{ type: 'text'; text: string }>
  /**
   * Machine-readable mirror of `content`, validated by clients against the
   * tool's `outputSchema`. Per the MCP spec, `content` stays authoritative
   * for display/back-compat; `structuredContent` is additive. Only ever an
   * object — CallToolResult requires the root to be a JSON object, so array
   * results (e.g. a list) are wrapped (e.g. `{ items: [...] }`) rather than
   * returned bare.
   */
  structuredContent?: Record<string, unknown>
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
  /**
   * JSON Schema for `structuredContent` on a successful (non-error) result.
   * Required by the Connectors/Smithery directories so clients can validate
   * and render tool results without re-deriving the shape from prose. Error
   * results (`isError: true`) are exempt — they carry a plain-text message.
   */
  outputSchema: Record<string, unknown>
  /**
   * MCP tool annotations advertised to the client. Anthropic's Connectors
   * Directory REQUIRES every tool to carry a `title` plus a safety hint:
   * `readOnlyHint: true` for read-only tools (auto-permitted) or
   * `destructiveHint: true` for tools with side effects (always prompt). A
   * read-only tool must NOT also set `destructiveHint` — the two are mutually
   * exclusive here. See compliance/policies/03-review-criteria-checklist.md.
   */
  annotations: ToolAnnotations
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
  ...monitorTools,
  ...aiVisibilityTools,
  ...sessionTools,
  browserTaskTool,
]

const byName: Record<string, AnakinTool> = Object.fromEntries(
  tools.map((t) => [t.name, t]),
)

/** Controls which tools a deployment advertises (see config.ts ToolProfile). */
export interface ToolExposure {
  toolProfile?: 'full' | 'readonly'
  disabledTools?: string[]
}

/**
 * Filter the full registry down to the tools a deployment should expose. The
 * `readonly` profile keeps only tools annotated `readOnlyHint: true` (which, by
 * the B1/B2 design, excludes every write/login/build tool). `disabledTools`
 * hides specific tools regardless of profile.
 */
export function selectExposedTools(
  all: AnakinTool[],
  cfg: ToolExposure,
): AnakinTool[] {
  let out = all
  if (cfg.toolProfile === 'readonly') {
    out = out.filter((t) => t.annotations.readOnlyHint === true)
  }
  if (cfg.disabledTools && cfg.disabledTools.length > 0) {
    const off = new Set(cfg.disabledTools)
    out = out.filter((t) => !off.has(t.name))
  }
  return out
}

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

/**
 * Max characters in a single tool result. claude.ai / Claude Desktop cap tool
 * results at ~150k chars and the directory asks servers to use tokens
 * "frugally and proportionally", so we cap below that with headroom for the
 * JSON-RPC envelope. Oversized results (big crawls, huge pages) are truncated
 * with a notice telling the model how to narrow the request. See
 * compliance/policies/04-building-connectors-technical.md.
 */
export const MAX_TOOL_RESULT_CHARS = 100_000

function capToolText(text: string): string {
  if (text.length <= MAX_TOOL_RESULT_CHARS) return text
  const kept = text.slice(0, MAX_TOOL_RESULT_CHARS)
  return (
    kept +
    `\n\n…[truncated: result was ${text.length} characters; capped at ` +
    `${MAX_TOOL_RESULT_CHARS} to stay within client limits. Narrow the request — ` +
    `e.g. lower maxPages/limit, add includePatterns/excludePatterns, or fetch a ` +
    `single URL — to get complete data.]`
  )
}

/**
 * Helper to wrap a string result in MCP's content envelope. `structured`
 * (when the caller has it on hand) is attached as `structuredContent`
 * alongside the text — used by tools whose primary content is prose (e.g.
 * scrape's markdown) but that still want to advertise an outputSchema.
 */
export function ok(text: string, structured?: Record<string, unknown>): ToolContent {
  const result: ToolContent = { content: [{ type: 'text', text: capToolText(text) }] }
  if (structured !== undefined) result.structuredContent = structured
  return result
}

/**
 * Helper to JSON-stringify a result for tool output. Also sets
 * `structuredContent` when `value` is a plain object — CallToolResult
 * requires an object root, so a bare array/primitive is text-only (callers
 * returning a list wrap it first, e.g. `okJson({ items: list })`).
 */
export function okJson(value: unknown): ToolContent {
  const result = ok(JSON.stringify(value, null, 2))
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    result.structuredContent = value as Record<string, unknown>
  }
  return result
}
