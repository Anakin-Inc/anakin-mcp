/**
 * Unit tests for the tool registry (copied from the stdio package).
 *
 * These verify the public contract of the MCP surface:
 *   - the right tools are exposed
 *   - each tool has a structurally valid JSON Schema
 *   - dispatchTool routes by name and surfaces errors as MCP error responses
 *     rather than throwing
 *
 * The actual underlying API calls are not exercised here — those are the
 * AnakinClient's responsibility. This file's job is to verify the MCP glue
 * (tool registry + dispatcher) survived the copy unchanged.
 */

import { describe, it, expect, vi } from 'vitest'

import {
  tools,
  dispatchTool,
  selectExposedTools,
  ok,
  okJson,
  type ToolContent,
} from '../src/tools/index.js'
import { AnakinClient } from '../src/client.js'

const EXPECTED_TOOL_NAMES = [
  'scrape',
  'search',
  'map',
  'crawl',
  'agentic_search',
  'wire_discover',
  'wire_catalog',
  'wire_read_action',
  'wire_write_action',
  'wire_identities',
  'wire_login',
  'wire_build',
  'wire_build_status',
  'monitor_create',
  'monitor_list',
  'monitor_changes',
  'monitor_control',
  'ai_visibility_search',
  'ai_visibility_sources',
  'session_list',
  'session_delete',
  'browser_task',
] as const

// Read-only tools advertise readOnlyHint; everything else has a side effect and
// must advertise destructiveHint. Mirrors the Connectors Directory requirement.
const DESTRUCTIVE_TOOL_NAMES = new Set([
  'wire_write_action',
  'wire_login',
  'wire_build',
  'monitor_create',
  'monitor_control',
  'session_delete',
  'browser_task',
])

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

  it('tool names are <= 64 chars (Connectors Directory limit)', () => {
    for (const tool of tools) {
      expect(tool.name.length).toBeLessThanOrEqual(64)
    }
  })
})

describe('tool annotations (Connectors Directory requirements)', () => {
  it('every tool has a non-empty title', () => {
    for (const tool of tools) {
      expect(typeof tool.annotations.title).toBe('string')
      expect(tool.annotations.title!.length).toBeGreaterThan(0)
    }
  })

  it('every tool carries exactly one safety hint: readOnlyHint XOR destructiveHint', () => {
    for (const tool of tools) {
      const readOnly = tool.annotations.readOnlyHint === true
      const destructive = tool.annotations.destructiveHint === true
      // exactly one must be set
      expect(readOnly !== destructive).toBe(true)
    }
  })

  it('destructive tools (writes/side effects) are annotated destructive, not read-only', () => {
    for (const tool of tools) {
      const shouldBeDestructive = DESTRUCTIVE_TOOL_NAMES.has(tool.name)
      expect(tool.annotations.destructiveHint === true).toBe(shouldBeDestructive)
      expect(tool.annotations.readOnlyHint === true).toBe(!shouldBeDestructive)
    }
  })
})

describe('selectExposedTools (tool-exposure profile)', () => {
  it('full profile (default) exposes every tool', () => {
    expect(selectExposedTools(tools, {}).map((t) => t.name)).toEqual(tools.map((t) => t.name))
    expect(selectExposedTools(tools, { toolProfile: 'full' })).toHaveLength(tools.length)
  })

  it('readonly profile exposes only read-only tools (drops every destructive tool)', () => {
    const names = selectExposedTools(tools, { toolProfile: 'readonly' }).map((t) => t.name)
    expect(names).toHaveLength(EXPECTED_TOOL_NAMES.length - DESTRUCTIVE_TOOL_NAMES.size)
    for (const n of DESTRUCTIVE_TOOL_NAMES) {
      expect(names).not.toContain(n)
    }
    // Sanity: all kept tools are annotated read-only.
    expect(
      selectExposedTools(tools, { toolProfile: 'readonly' }).every(
        (t) => t.annotations.readOnlyHint === true,
      ),
    ).toBe(true)
  })

  it('disabledTools hides specific tools regardless of profile', () => {
    const names = selectExposedTools(tools, { disabledTools: ['crawl', 'wire_build'] }).map((t) => t.name)
    expect(names).not.toContain('crawl')
    expect(names).not.toContain('wire_build')
    expect(names).toContain('scrape')
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

  it('wire_read_action / wire_write_action require action_id (params optional — some actions take none)', () => {
    for (const name of ['wire_read_action', 'wire_write_action']) {
      const wire = tools.find((t) => t.name === name)!
      const schema = wire.inputSchema as { required?: string[] }
      expect(schema.required).toEqual(['action_id'])
    }
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

  it('monitor_create requires url and intervalMinutes (min 15)', () => {
    const create = tools.find((t) => t.name === 'monitor_create')!
    const schema = create.inputSchema as {
      required?: string[]
      properties?: Record<string, { minimum?: number }>
    }
    expect(schema.required).toEqual(expect.arrayContaining(['url', 'intervalMinutes']))
    expect(schema.properties?.['intervalMinutes']?.minimum).toBe(15)
  })

  it('monitor_control requires id and a closed action enum', () => {
    const control = tools.find((t) => t.name === 'monitor_control')!
    const schema = control.inputSchema as {
      required?: string[]
      properties?: Record<string, { enum?: string[] }>
    }
    expect(schema.required).toEqual(expect.arrayContaining(['id', 'action']))
    expect(schema.properties?.['action']?.enum).toEqual([
      'pause',
      'resume',
      'run_now',
      'delete',
    ])
  })

  it('ai_visibility_search requires query', () => {
    const search = tools.find((t) => t.name === 'ai_visibility_search')!
    const schema = search.inputSchema as { required?: string[] }
    expect(schema.required).toContain('query')
  })

  it('session_delete requires id', () => {
    const del = tools.find((t) => t.name === 'session_delete')!
    const schema = del.inputSchema as { required?: string[] }
    expect(schema.required).toContain('id')
  })

  it('browser_task requires prompt and does NOT accept secret_values', () => {
    const task = tools.find((t) => t.name === 'browser_task')!
    const schema = task.inputSchema as {
      required?: string[]
      properties?: Record<string, unknown>
    }
    expect(schema.required).toContain('prompt')
    // Deliberate omission: credentials must never transit the chat transcript.
    expect(schema.properties).not.toHaveProperty('secret_values')
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
    // tool-internal failure (e.g., a network error from the underlying client).
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

describe('wire_build catalog-build shape', () => {
  const build = () => tools.find((t) => t.name === 'wire_build')!

  it('accepts actions, country, and credential (credential requires type)', () => {
    const schema = build().inputSchema as {
      properties: Record<string, Record<string, unknown>>
    }
    expect(schema.properties['actions']?.['type']).toBe('array')
    expect(schema.properties['country']?.['type']).toBe('string')
    const cred = schema.properties['credential'] as {
      required?: string[]
      properties?: Record<string, { enum?: string[] }>
      additionalProperties?: boolean
    }
    expect(cred.required).toEqual(['type'])
    expect(cred.properties?.['type']?.enum).toEqual(['plain', 'vault'])
    expect(cred.additionalProperties).toBe(false)
  })

  it('forwards actions, country, and credential to the API', async () => {
    const client = new AnakinClient({ apiKey: 'ak-test' })
    const spy = vi
      .spyOn(client, 'wireBuild')
      .mockResolvedValue({ status: 'ok', build_request: { id: 'br1', status: 'pending' } })

    const credential = {
      type: 'plain',
      username: 'user@example.com',
      password: 'pw',
      login_url: 'https://example.com/login',
    }
    const result = await dispatchTool(client, 'wire_build', {
      website_url: 'https://example.com',
      goal: 'read product details',
      actions: ['search products', 'get product details'],
      country: 'US',
      credential,
    })

    expect(spy).toHaveBeenCalledWith({
      website_url: 'https://example.com',
      goal: 'read product details',
      actions: ['search products', 'get product details'],
      country: 'US',
      credential,
    })
    expect(result.isError).toBeUndefined()
    vi.restoreAllMocks()
  })

  it('omits the new fields entirely when not given (back-compat body)', async () => {
    const client = new AnakinClient({ apiKey: 'ak-test' })
    const spy = vi
      .spyOn(client, 'wireBuild')
      .mockResolvedValue({ status: 'ok', build_request: { id: 'br2', status: 'pending' } })

    await dispatchTool(client, 'wire_build', {
      website_url: 'https://example.com',
      goal: 'read product details',
    })

    expect(spy).toHaveBeenCalledWith({
      website_url: 'https://example.com',
      goal: 'read product details',
    })
    vi.restoreAllMocks()
  })

  it('financial block also scans the actions list', async () => {
    const client = new AnakinClient({ apiKey: 'ak-test' })
    const spy = vi.spyOn(client, 'wireBuild')

    const result = await dispatchTool(client, 'wire_build', {
      website_url: 'https://example.com',
      goal: 'automate my account',
      actions: ['transfer funds to another account'],
    })

    expect(result.isError).toBe(true)
    expect(spy).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('accepts a stringified credential (client flattened the object) instead of a silent public build', async () => {
    const client = new AnakinClient({ apiKey: 'ak-test' })
    const spy = vi
      .spyOn(client, 'wireBuild')
      .mockResolvedValue({ status: 'ok', build_request: { id: 'br3', status: 'pending' } })

    const result = await dispatchTool(client, 'wire_build', {
      website_url: 'https://example.com',
      goal: 'read my dashboard',
      credential: '{"type":"plain","username":"u","password":"p"}',
    })

    expect(result.isError).toBeUndefined()
    expect(spy).toHaveBeenCalledWith({
      website_url: 'https://example.com',
      goal: 'read my dashboard',
      credential: { type: 'plain', username: 'u', password: 'p' },
    })
    vi.restoreAllMocks()
  })

  it('rejects a credential string that is not resolvable JSON', async () => {
    const client = new AnakinClient({ apiKey: 'ak-test' })
    const spy = vi.spyOn(client, 'wireBuild')

    const result = await dispatchTool(client, 'wire_build', {
      website_url: 'https://example.com',
      goal: 'read my dashboard',
      credential: 'my username is u and password p',
    })

    expect(result.isError).toBe(true)
    expect(spy).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('rejects a plain credential missing its password', async () => {
    const client = new AnakinClient({ apiKey: 'ak-test' })
    const spy = vi.spyOn(client, 'wireBuild')

    const result = await dispatchTool(client, 'wire_build', {
      website_url: 'https://example.com',
      goal: 'read my dashboard',
      credential: { type: 'plain', username: 'u' },
    })

    expect(result.isError).toBe(true)
    expect(spy).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })

  it('accepts a single capability given as a bare string (wrapped as one action)', async () => {
    const client = new AnakinClient({ apiKey: 'ak-test' })
    const spy = vi
      .spyOn(client, 'wireBuild')
      .mockResolvedValue({ status: 'ok', build_request: { id: 'br4', status: 'pending' } })

    await dispatchTool(client, 'wire_build', {
      website_url: 'https://example.com',
      goal: 'read products',
      actions: 'get order history',
    })

    expect(spy).toHaveBeenCalledWith({
      website_url: 'https://example.com',
      goal: 'read products',
      actions: ['get order history'],
    })
    vi.restoreAllMocks()
  })

  it('accepts a JSON-array string of actions', async () => {
    const client = new AnakinClient({ apiKey: 'ak-test' })
    const spy = vi
      .spyOn(client, 'wireBuild')
      .mockResolvedValue({ status: 'ok', build_request: { id: 'br5', status: 'pending' } })

    await dispatchTool(client, 'wire_build', {
      website_url: 'https://example.com',
      goal: 'read products',
      actions: '["search products", "get product details"]',
    })

    expect(spy).toHaveBeenCalledWith({
      website_url: 'https://example.com',
      goal: 'read products',
      actions: ['search products', 'get product details'],
    })
    vi.restoreAllMocks()
  })

  it('rejects actions of a non-string, non-array type', async () => {
    const client = new AnakinClient({ apiKey: 'ak-test' })
    const spy = vi.spyOn(client, 'wireBuild')

    const result = await dispatchTool(client, 'wire_build', {
      website_url: 'https://example.com',
      goal: 'read products',
      actions: 42,
    })

    expect(result.isError).toBe(true)
    expect(spy).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})

describe('wire_build_status tool', () => {
  it('detail mode fetches by id and strips the verbose events log by default', async () => {
    const client = new AnakinClient({ apiKey: 'ak-test' })
    const spy = vi.spyOn(client, 'wireBuildStatus').mockResolvedValue({
      status: 'ok',
      build_request: { id: 'br1', status: 'success', skipped: [] },
      actions: [{ action_id: 'act_1', status: 'active' }],
      events: [{ step: 'noisy' }],
      catalog_slug: 'example',
    })

    const result = await dispatchTool(client, 'wire_build_status', { id: 'br1' })

    expect(spy).toHaveBeenCalledWith('br1')
    expect(result.isError).toBeUndefined()
    const payload = JSON.parse(result.content[0]!.text)
    expect(payload.build_request.id).toBe('br1')
    expect(payload.actions[0].action_id).toBe('act_1')
    expect(payload).not.toHaveProperty('events')
    vi.restoreAllMocks()
  })

  it('detail mode keeps events when include_events is true', async () => {
    const client = new AnakinClient({ apiKey: 'ak-test' })
    vi.spyOn(client, 'wireBuildStatus').mockResolvedValue({
      status: 'ok',
      build_request: { id: 'br1', status: 'processing' },
      events: [{ step: 'fetching page' }],
    })

    const result = await dispatchTool(client, 'wire_build_status', {
      id: 'br1',
      include_events: true,
    })
    const payload = JSON.parse(result.content[0]!.text)
    expect(payload.events).toEqual([{ step: 'fetching page' }])
    vi.restoreAllMocks()
  })

  it('list mode forwards status, limit, and page', async () => {
    const client = new AnakinClient({ apiKey: 'ak-test' })
    const spy = vi
      .spyOn(client, 'wireBuildList')
      .mockResolvedValue({ status: 'ok', build_requests: [], pagination: {} })

    await dispatchTool(client, 'wire_build_status', { status: 'pending', limit: 5, page: 2 })

    expect(spy).toHaveBeenCalledWith({ status: 'pending', limit: 5, page: 2 })
    vi.restoreAllMocks()
  })

  it('list mode applies the advertised default limit of 10 when omitted', async () => {
    const client = new AnakinClient({ apiKey: 'ak-test' })
    const spy = vi
      .spyOn(client, 'wireBuildList')
      .mockResolvedValue({ status: 'ok', build_requests: [], pagination: {} })

    await dispatchTool(client, 'wire_build_status', {})

    expect(spy).toHaveBeenCalledWith({ limit: 10 })
    vi.restoreAllMocks()
  })

  it('rejects a blank id instead of silently switching to list mode', async () => {
    const client = new AnakinClient({ apiKey: 'ak-test' })
    const detail = vi.spyOn(client, 'wireBuildStatus')
    const list = vi.spyOn(client, 'wireBuildList')

    const result = await dispatchTool(client, 'wire_build_status', { id: '' })

    expect(result.isError).toBe(true)
    expect(detail).not.toHaveBeenCalled()
    expect(list).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})
