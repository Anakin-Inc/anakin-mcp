/**
 * Behavior tests for the product tool families added for the newer Anakin
 * surface (Website Monitoring, AI Visibility, Browser Sessions, AI browser
 * automation), plus the AnakinClient polling paths that back them.
 *
 * Handler tests stub AnakinClient methods; client tests mock global fetch.
 */

import { describe, it, expect, vi, afterEach } from 'vitest'

import { tools, dispatchTool } from '../src/tools/index.js'
import { redactSecrets } from '../src/tools/monitor.js'
import { AnakinClient, AnakinError } from '../src/client.js'

function makeClient(): AnakinClient {
  return new AnakinClient({ apiKey: 'ak-test' })
}

function textOf(result: { content: Array<{ text: string }> }): string {
  return result.content[0]!.text
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('monitor tools', () => {
  it('monitor_create forwards options and redacts alertWebhookSecret', async () => {
    const client = makeClient()
    const spy = vi.spyOn(client, 'monitorCreate').mockResolvedValue({
      id: 'm1',
      url: 'https://example.com',
      intervalMinutes: 60,
      alertWebhookSecret: 'whsec_super_secret',
    })

    const result = await dispatchTool(client, 'monitor_create', {
      url: 'https://example.com',
      intervalMinutes: 60,
      watchMode: 'specific_data',
      outputSchema: { type: 'object' },
      aiMode: true,
    })

    expect(spy).toHaveBeenCalledWith('https://example.com', 60, {
      watchMode: 'specific_data',
      outputSchema: { type: 'object' },
      aiMode: true,
    })
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).not.toContain('whsec_super_secret')
    expect(textOf(result)).toContain('[redacted')
  })

  it('monitor_list fetches one monitor when id is given, the list otherwise', async () => {
    const client = makeClient()
    const getSpy = vi.spyOn(client, 'monitorGet').mockResolvedValue({ id: 'm1' })
    const listSpy = vi
      .spyOn(client, 'monitorList')
      .mockResolvedValue({ monitors: [] })

    await dispatchTool(client, 'monitor_list', { id: 'm1' })
    expect(getSpy).toHaveBeenCalledWith('m1')

    await dispatchTool(client, 'monitor_list', {})
    expect(listSpy).toHaveBeenCalled()
  })

  it('monitor_control dispatches every action and rejects unknown ones', async () => {
    const client = makeClient()
    const spy = vi.spyOn(client, 'monitorControl').mockResolvedValue({ success: true })

    for (const action of ['pause', 'resume', 'run_now', 'delete'] as const) {
      const result = await dispatchTool(client, 'monitor_control', { id: 'm1', action })
      expect(result.isError).toBeUndefined()
      expect(spy).toHaveBeenCalledWith('m1', action)
    }

    const bad = await dispatchTool(client, 'monitor_control', {
      id: 'm1',
      action: 'detonate',
    })
    expect(bad.isError).toBe(true)
    expect(spy).toHaveBeenCalledTimes(4)
  })

  it('redactSecrets walks nested lists of monitors', () => {
    const redacted = redactSecrets({
      monitors: [{ id: 'm1', alertWebhookSecret: 'whsec_a' }, { id: 'm2' }],
    }) as { monitors: Array<Record<string, unknown>> }
    expect(redacted.monitors[0]!['alertWebhookSecret']).toMatch(/redacted/)
    expect(redacted.monitors[1]).toEqual({ id: 'm2' })
  })
})

describe('ai_visibility_search', () => {
  const searchPayload = {
    search_id: 's1',
    status: 'completed',
    country: 'us',
    synthesis: 'Engines broadly agree.',
    results: [
      {
        source: 'chatgpt',
        status: 'completed',
        summary: 'short answer',
        full_content: '{"huge":"raw engine payload"}',
        verdict: 'consensus',
      },
    ],
  }

  it('strips full_content by default', async () => {
    const client = makeClient()
    vi.spyOn(client, 'aiVisibilitySearch').mockResolvedValue(searchPayload)

    const result = await dispatchTool(client, 'ai_visibility_search', {
      query: 'what is anakin.io?',
    })
    expect(textOf(result)).not.toContain('raw engine payload')
    expect(textOf(result)).toContain('short answer')
    expect(textOf(result)).toContain('Engines broadly agree.')
  })

  it('keeps full_content when include_full_content=true', async () => {
    const client = makeClient()
    vi.spyOn(client, 'aiVisibilitySearch').mockResolvedValue(searchPayload)

    const result = await dispatchTool(client, 'ai_visibility_search', {
      query: 'what is anakin.io?',
      include_full_content: true,
    })
    expect(textOf(result)).toContain('raw engine payload')
  })
})

describe('session tools', () => {
  it('session_list forwards the domain filter', async () => {
    const client = makeClient()
    const spy = vi.spyOn(client, 'sessionsList').mockResolvedValue({ sessions: [] })
    await dispatchTool(client, 'session_list', { domain: 'amazon.com' })
    expect(spy).toHaveBeenCalledWith('amazon.com')
  })

  it('session_delete passes the id through', async () => {
    const client = makeClient()
    const spy = vi.spyOn(client, 'sessionDelete').mockResolvedValue({ success: true })
    await dispatchTool(client, 'session_delete', { id: 'sess-1' })
    expect(spy).toHaveBeenCalledWith('sess-1')
  })
})

describe('browser_task', () => {
  it('refuses financial instructions without calling the API', async () => {
    const client = makeClient()
    const spy = vi.spyOn(client, 'browserTask')

    const result = await dispatchTool(client, 'browser_task', {
      prompt: 'go to my cart and checkout with the saved card',
    })
    expect(result.isError).toBe(true)
    expect(textOf(result)).toMatch(/financial transactions/)
    expect(spy).not.toHaveBeenCalled()
  })

  it('summarizes steps to a count and returns the result', async () => {
    const client = makeClient()
    vi.spyOn(client, 'browserTask').mockResolvedValue({
      success: true,
      result: { title: 'Cheapest 65" TV' },
      steps: [{ tool: 'goto' }, { tool: 'click' }, { tool: 'extract' }],
      iterations: 3,
      cached: false,
      run_id: 'run-1',
      duration_ms: 42_000,
    })

    const result = await dispatchTool(client, 'browser_task', {
      prompt: 'find the cheapest 65 inch TV',
      url: 'https://example-shop.com',
    })
    const parsed = JSON.parse(textOf(result))
    expect(parsed.result).toEqual({ title: 'Cheapest 65" TV' })
    expect(parsed.steps_taken).toBe(3)
    expect(parsed).not.toHaveProperty('steps')
    expect(parsed.run_id).toBe('run-1')
  })
})

// ── AnakinClient polling paths ───────────────────────────────────────────

type FetchStep = { body: unknown; status?: number }

/** Install a fetch mock that replays `steps` in order and records calls. */
function mockFetchSequence(steps: FetchStep[]): Array<{ url: string; init: RequestInit }> {
  const calls: Array<{ url: string; init: RequestInit }> = []
  let i = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      const step = steps[Math.min(i++, steps.length - 1)]!
      const status = step.status ?? 200
      return {
        ok: status >= 200 && status < 300,
        status,
        json: async () => step.body,
      }
    }),
  )
  return calls
}

describe('AnakinClient.aiVisibilitySearch', () => {
  it('submits, polls, and returns a terminal payload — including failed runs', async () => {
    const failedRun = {
      search_id: 's9',
      status: 'failed',
      results: [{ source: 'gemini', status: 'failed', error: 'engine timeout' }],
    }
    const calls = mockFetchSequence([
      { body: { search_id: 's9', status: 'running', results: [] } },
      { body: failedRun },
    ])

    const client = makeClient()
    const search = await client.aiVisibilitySearch('q', { country: 'de' })

    // Failed is a terminal *result*, not an exception — per-source errors matter.
    expect(search).toEqual(failedRun)
    expect(calls[0]!.url).toContain('/ai-visibility/search')
    expect(calls[0]!.init.method).toBe('POST')
    expect(JSON.parse(calls[0]!.init.body as string)).toEqual({
      query: 'q',
      country: 'de',
    })
    expect(calls[1]!.url).toContain('/ai-visibility/search/s9')
  })
})

describe('AnakinClient.browserTask', () => {
  it('submits in async mode and polls the workflow to completion', async () => {
    const calls = mockFetchSequence([
      { body: { workflow_id: 'w1', status: 'running' }, status: 202 },
      {
        body: {
          workflow_id: 'w1',
          status: 'completed',
          result: { success: true, result: 'done', run_id: 'r1' },
        },
      },
    ])

    const client = makeClient()
    const task = await client.browserTask('do the thing', { sessionId: 'sess-1' })

    expect(task).toEqual({ success: true, result: 'done', run_id: 'r1' })
    const submitBody = JSON.parse(calls[0]!.init.body as string)
    expect(submitBody).toEqual({
      prompt: 'do the thing',
      async: true,
      session_id: 'sess-1',
    })
    expect(calls[1]!.url).toContain('/ai/jobs/w1')
  })

  it('throws on timed_out with the job error surfaced', async () => {
    mockFetchSequence([
      { body: { workflow_id: 'w2', status: 'running' }, status: 202 },
      { body: { workflow_id: 'w2', status: 'timed_out', error: 'deadline exceeded' } },
    ])

    const client = makeClient()
    await expect(client.browserTask('slow task')).rejects.toThrowError(
      /Browser task timed_out: deadline exceeded/,
    )
    await expect(
      (async () => {
        mockFetchSequence([
          { body: { workflow_id: 'w3', status: 'running' }, status: 202 },
          { body: { workflow_id: 'w3', status: 'failed', error: 'agent crashed' } },
        ])
        return makeClient().browserTask('bad task')
      })(),
    ).rejects.toBeInstanceOf(AnakinError)
  })
})

describe('AnakinClient.monitorControl', () => {
  it('maps actions onto the right method + path', async () => {
    const calls = mockFetchSequence([{ body: { success: true } }])
    const client = makeClient()

    await client.monitorControl('m1', 'pause')
    await client.monitorControl('m1', 'resume')
    await client.monitorControl('m1', 'run_now')
    await client.monitorControl('m1', 'delete')

    expect(calls.map((c) => [c.init.method, new URL(c.url).pathname])).toEqual([
      ['POST', '/v1/monitors/m1/pause'],
      ['POST', '/v1/monitors/m1/resume'],
      ['POST', '/v1/monitors/m1/run'],
      ['DELETE', '/v1/monitors/m1'],
    ])
  })
})
