/**
 * Unit tests for the tool registry.
 *
 * These verify the public contract of @anakin-io/mcp's MCP surface:
 *   - the right tools are exposed
 *   - each tool has a structurally valid JSON Schema
 *   - dispatchTool routes by name and surfaces errors as MCP error responses
 *     rather than throwing
 *
 * The actual underlying SDK calls are not exercised here — those are the
 * SDK's responsibility. This test file's job is to verify that the MCP
 * glue (tool registry + dispatcher) is correct.
 */

import { describe, it, expect, vi } from 'vitest'

import { tools, dispatchTool, ok, okJson, type ToolContent } from '../src/tools/index.js'
import { AnakinClient } from '../src/client.js'

const EXPECTED_TOOL_NAMES = [
  'scrape',
  'search',
  'map',
  'crawl',
  'agentic_search',
  'wire_discover',
  'wire_catalog',
  'wire_action',
  'wire_identities',
  'wire_login',
  'wire_build',
] as const

describe('tools registry', () => {
  it('exposes exactly the expected tools', () => {
    expect(tools).toHaveLength(EXPECTED_TOOL_NAMES.length)
    expect(tools.map((t) => t.name)).toEqual([...EXPECTED_TOOL_NAMES])
  })

  it('every tool has name, description, inputSchema, handler', () => {
    for (const tool of tools) {
      expect(tool.name).toBeTruthy()
      expect(typeof tool.name).toBe('string')

      expect(tool.description).toBeTruthy()
      expect(typeof tool.description).toBe('string')
      expect(tool.description.length).toBeGreaterThan(20) // not a placeholder

      expect(tool.inputSchema).toBeTruthy()
      expect(typeof tool.inputSchema).toBe('object')

      expect(tool.handler).toBeInstanceOf(Function)
    }
  })

  it("every tool's inputSchema is a JSON Schema object with `type: 'object'`", () => {
    for (const tool of tools) {
      const schema = tool.inputSchema as { type?: unknown; properties?: unknown }
      expect(schema.type).toBe('object')
      expect(schema.properties).toBeTruthy()
    }
  })

  it('tool names are unique', () => {
    const names = tools.map((t) => t.name)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('per-tool input schema spot checks', () => {
  it('scrape requires url', () => {
    const scrape = tools.find((t) => t.name === 'scrape')!
    const schema = scrape.inputSchema as { required?: string[] }
    expect(schema.required).toContain('url')
  })

  it('search requires prompt', () => {
    const search = tools.find((t) => t.name === 'search')!
    const schema = search.inputSchema as { required?: string[] }
    expect(schema.required).toContain('prompt')
  })

  it('agentic_search requires prompt', () => {
    const ag = tools.find((t) => t.name === 'agentic_search')!
    const schema = ag.inputSchema as { required?: string[] }
    expect(schema.required).toContain('prompt')
  })

  it('wire_action requires action_id (params optional — some actions take none)', () => {
    const wire = tools.find((t) => t.name === 'wire_action')!
    const schema = wire.inputSchema as { required?: string[] }
    expect(schema.required).toEqual(['action_id'])
  })

  it('wire_discover requires q', () => {
    const discover = tools.find((t) => t.name === 'wire_discover')!
    const schema = discover.inputSchema as { required?: string[] }
    expect(schema.required).toContain('q')
  })

  it('wire_build requires website_url and goal', () => {
    const build = tools.find((t) => t.name === 'wire_build')!
    const schema = build.inputSchema as { required?: string[] }
    expect(schema.required).toEqual(expect.arrayContaining(['website_url', 'goal']))
  })
})

describe('dispatchTool', () => {
  // A minimal stand-in client; tools never actually call the network in
  // these tests because we only look at the dispatcher routing layer.
  function makeStubClient(): AnakinClient {
    return new AnakinClient({ apiKey: 'ak-stub' })
  }

  it('returns an MCP error response for an unknown tool (does not throw)', async () => {
    const client = makeStubClient()
    const result = await dispatchTool(client, 'no_such_tool', {})
    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toMatch(/Unknown tool: no_such_tool/)
  })

  it("catches handler errors and returns an MCP error envelope (doesn't throw)", async () => {
    // Replace the scrape tool's handler with one that throws to simulate a
    // tool-internal failure (e.g., a network error from the underlying SDK).
    const scrape = tools.find((t) => t.name === 'scrape')!
    const originalHandler = scrape.handler
    scrape.handler = vi.fn(async () => {
      throw new Error('simulated upstream failure')
    })

    try {
      const client = makeStubClient()
      const result = await dispatchTool(client, 'scrape', { url: 'https://example.com' })
      expect(result.isError).toBe(true)
      expect(result.content[0]?.text).toMatch(/Tool 'scrape' failed: simulated upstream failure/)
    } finally {
      scrape.handler = originalHandler
    }
  })
})

describe('ok / okJson helpers', () => {
  it('ok wraps a string in MCP text content', () => {
    const result: ToolContent = ok('hello world')
    expect(result.content).toEqual([{ type: 'text', text: 'hello world' }])
    expect(result.isError).toBeUndefined()
  })

  it('okJson serializes a value with stable formatting', () => {
    const result = okJson({ a: 1, b: [2, 3] })
    expect(result.content[0]?.type).toBe('text')
    expect(JSON.parse(result.content[0]!.text)).toEqual({ a: 1, b: [2, 3] })
  })
})
