/**
 * AI browser automation tool.
 *
 * `browser_task` hands a natural-language instruction to Anakin's browser AI
 * agent, which drives a real stealth browser (navigate, click, type, extract)
 * and returns the outcome — optionally as structured JSON. Submitted in async
 * mode and polled to completion (server hard-caps a run at ~5.5 minutes).
 *
 * Two deliberate omissions from the API's surface:
 *   - `secret_values` (credential injection) is NOT exposed: secrets passed
 *     through a tool call enter the chat transcript and are compromised by
 *     definition. Authenticated tasks use a saved session (session_list)
 *     instead — same capability, no secret in the conversation.
 *   - full per-step logs are summarized to a count; the run_id links to the
 *     complete log in the dashboard. Keeps results within client token caps.
 *
 * Like wire_write_action, this can change state on target sites, so it is
 * annotated destructive and refuses payment/fund-transfer instructions
 * (Connectors Directory policy) — see policy.ts.
 */

import type { AnakinTool } from './index.js'
import { okJson } from './index.js'
import { financialBlockReason } from './policy.js'

export const browserTaskTool: AnakinTool = {
  name: 'browser_task',
  description:
    'Run a natural-language task in a real cloud browser driven by an AI agent: it navigates, clicks, types, scrolls, and extracts on your behalf ("find the cheapest 65-inch TV on this site and list its specs", "fill the contact form with …"). Use when scrape cannot do the job (multi-step flows, interactions, complex navigation) and no Wire action covers the site (check wire_discover first — Wire actions are faster and cheaper). Async; runs up to ~5 minutes and this tool polls to completion. For login-protected tasks pass session_id from session_list — never put passwords in the prompt. Supply output_schema to get structured JSON back. It does not execute payments or transfer funds; such tasks are refused. Returns the task result plus run metadata (steps taken, duration, run_id).',
  annotations: {
    title: 'Run an AI browser task',
    // Drives a real browser that can change state on target sites → prompt.
    destructiveHint: true,
    openWorldHint: true,
  },
  inputSchema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description:
          'The task in natural language. Be specific about the goal and what to return. Never include passwords or secrets — use session_id for authenticated sites.',
      },
      url: {
        type: 'string',
        description:
          'Navigate here before starting. Omit to let the agent follow URLs named in the prompt.',
      },
      session_id: {
        type: 'string',
        description:
          'Saved browser-session ID (from session_list) so the task runs logged in.',
      },
      max_steps: {
        type: 'integer',
        description: 'Cap on agent steps (navigation/click/type actions).',
        minimum: 1,
      },
      timeout_ms: {
        type: 'integer',
        description: 'Task timeout in milliseconds (server caps runs at ~330s regardless).',
        minimum: 1000,
      },
      output_schema: {
        type: 'object',
        description:
          'JSON Schema for the result — the agent returns structured data conforming to it.',
        additionalProperties: true,
      },
    },
    required: ['prompt'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      success: { type: 'boolean' },
      result: {
        description:
          'The task result — structured JSON matching output_schema if it was supplied, otherwise a free-form value.',
      },
      steps_taken: { type: 'integer' },
      iterations: { type: 'integer' },
      cached: { type: 'boolean' },
      duration_ms: { type: 'integer' },
      run_id: { type: 'string' },
    },
    additionalProperties: false,
  },
  handler: async (client, args) => {
    const prompt = String(args['prompt'])
    const url = typeof args['url'] === 'string' ? args['url'] : undefined

    // Directory policy: never execute financial transactions / asset transfers.
    const blocked = financialBlockReason(`${prompt} ${url ?? ''}`)
    if (blocked) return { isError: true, content: [{ type: 'text', text: blocked }] }

    const opts: Parameters<typeof client.browserTask>[1] = {}
    if (url !== undefined) opts.url = url
    if (typeof args['session_id'] === 'string') opts.sessionId = args['session_id']
    if (typeof args['max_steps'] === 'number') opts.maxSteps = args['max_steps']
    if (typeof args['timeout_ms'] === 'number') opts.timeoutMs = args['timeout_ms']
    if (typeof args['output_schema'] === 'object' && args['output_schema'] !== null) {
      opts.outputSchema = args['output_schema'] as Record<string, unknown>
    }

    const task = await client.browserTask(prompt, opts)

    return okJson({
      success: task.success,
      result: task.result,
      steps_taken: Array.isArray(task.steps) ? task.steps.length : undefined,
      iterations: task.iterations,
      cached: task.cached,
      duration_ms: task.duration_ms,
      run_id: task.run_id,
    })
  },
}
