/**
 * Website Monitoring tool family.
 *
 * Monitors watch a URL (or a whole site, or a Wire action's JSON) on a
 * schedule, snapshot every check, and record a change whenever the content
 * differs — optionally alerting a webhook/email. They reuse the scrape
 * pipeline, so anything scrape can fetch, a monitor can watch.
 *
 * Split by safety class for the Connectors Directory:
 *   - monitor_list / monitor_changes  — read-only.
 *   - monitor_create / monitor_control — create/pause/resume/run/delete are
 *     billed, recurring side effects → destructive.
 *
 * The API returns each monitor's `alertWebhookSecret` (an HMAC signing
 * secret). A secret that enters the chat transcript is compromised by
 * definition, so every response is passed through redactSecrets() before it
 * reaches the model; the user retrieves the real value from the dashboard.
 */

import type { AnakinTool } from './index.js'
import { okJson } from './index.js'

const SECRET_KEYS = new Set(['alertWebhookSecret'])
const REDACTED = '[redacted — view in the Anakin dashboard]'

/** Deep-copy `value` with any secret-bearing keys replaced. */
export function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets)
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SECRET_KEYS.has(k) && v ? REDACTED : redactSecrets(v)
    }
    return out
  }
  return value
}

const monitorCreateTool: AnakinTool = {
  name: 'monitor_create',
  description:
    'Create a scheduled website monitor that checks a URL every intervalMinutes (min 15) and records a change when the content differs — optionally alerting a webhook or email. scope "page" (default) watches one URL; "site" crawls the site each run and tracks pages added/removed/changed; "wire" runs a Wire action each check and diffs its JSON. watchMode "full_page" (2 credits/check) compares the whole page; "specific_data" (3 credits/check) extracts only the fields in outputSchema with AI — ideal for price/stock/status tracking. aiMode (+1 credit/check) filters out trivial noise and summarizes real changes. Active-monitor caps per plan: Free 5, Pro 20, Scale 100.',
  annotations: {
    title: 'Create a website monitor',
    // Creates a recurring, credit-billed job that can send alerts → prompt.
    destructiveHint: true,
    openWorldHint: true,
  },
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description:
          'The URL to watch (root URL for site scope; the Wire site\'s URL for wire scope).',
      },
      intervalMinutes: {
        type: 'integer',
        description: 'Check frequency in minutes. Minimum 15.',
        minimum: 15,
      },
      scope: {
        type: 'string',
        enum: ['page', 'site', 'wire'],
        description: 'What to monitor: one page (default), a whole site, or a Wire action.',
        default: 'page',
      },
      watchMode: {
        type: 'string',
        enum: ['full_page', 'specific_data'],
        description:
          'Compare the whole page (default) or only the fields in outputSchema, extracted with AI.',
        default: 'full_page',
      },
      watchFormat: {
        type: 'string',
        enum: ['markdown', 'html', 'cleaned_html'],
        description: 'Format compared in full_page mode. Defaults to markdown.',
        default: 'markdown',
      },
      outputSchema: {
        type: 'object',
        description:
          'JSON Schema of the fields to track. Required when watchMode is "specific_data".',
        additionalProperties: true,
      },
      aiMode: {
        type: 'boolean',
        description:
          'AI meaningful-change filtering: ignores trivial noise (ads, timestamps) and summarizes real changes. +1 credit per check.',
        default: false,
      },
      aiGoal: {
        type: 'string',
        description:
          'Natural-language description of which changes count as meaningful (used with aiMode), e.g. "only when the price drops or it goes out of stock".',
      },
      useBrowser: {
        type: 'boolean',
        description:
          'Render checks with a stealth headless browser (needed for JS-heavy pages). Forced true when sessionId is set.',
        default: false,
      },
      country: {
        type: 'string',
        description: 'Two-letter proxy country code. Defaults to "us".',
        default: 'us',
      },
      sessionId: {
        type: 'string',
        description:
          'Saved browser-session ID for monitoring login-protected pages (see session_list).',
      },
      isActive: {
        type: 'boolean',
        description: 'Start running immediately. Defaults to true.',
        default: true,
      },
      expiresAt: {
        type: 'string',
        description:
          'Optional end date (ISO 8601 timestamp or YYYY-MM-DD); the monitor auto-pauses when it passes.',
      },
      alertWebhookUrl: {
        type: 'string',
        description: 'Webhook URL that receives signed change alerts.',
      },
      alertEmails: {
        type: 'string',
        description: 'Comma-separated email recipients for change alerts.',
      },
      maxPages: {
        type: 'integer',
        description: 'Site scope: max pages crawled per run.',
        minimum: 1,
      },
      maxDepth: {
        type: 'integer',
        description: 'Site scope: crawl depth (1–5). Defaults to 2.',
        minimum: 1,
        maximum: 5,
      },
      includePatterns: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Site scope: glob patterns or hand-picked same-site URLs to track.',
      },
      excludePatterns: {
        type: 'array',
        items: { type: 'string' },
        description: 'Site scope: glob patterns to skip.',
      },
      wireActionId: {
        type: 'string',
        description:
          'Wire scope (required there): the Wire action run each check, e.g. "amazon.search_products" (see wire_discover).',
      },
      wireCatalogSlug: {
        type: 'string',
        description: 'Wire scope: catalogue slug of the Wire site.',
      },
      wireCredentialId: {
        type: 'string',
        description: 'Wire scope: credential ID when the action needs auth (see wire_identities).',
      },
      wireParams: {
        type: 'object',
        description: 'Wire scope: parameters passed to the action each check.',
        additionalProperties: true,
      },
      wireWatchPaths: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Wire scope: JSON paths to diff instead of the whole response.',
      },
    },
    required: ['url', 'intervalMinutes'],
    additionalProperties: false,
  },
  handler: async (client, args) => {
    const url = String(args['url'])
    const intervalMinutes = Number(args['intervalMinutes'])

    const opts: Parameters<typeof client.monitorCreate>[2] = {}
    const passthrough = [
      'scope',
      'watchMode',
      'watchFormat',
      'outputSchema',
      'aiMode',
      'aiGoal',
      'useBrowser',
      'country',
      'sessionId',
      'isActive',
      'expiresAt',
      'alertWebhookUrl',
      'alertEmails',
      'maxPages',
      'maxDepth',
      'includePatterns',
      'excludePatterns',
      'wireActionId',
      'wireCatalogSlug',
      'wireCredentialId',
      'wireParams',
      'wireWatchPaths',
    ] as const
    for (const key of passthrough) {
      if (args[key] !== undefined) {
        ;(opts as Record<string, unknown>)[key] = args[key]
      }
    }

    const monitor = await client.monitorCreate(url, intervalMinutes, opts)
    return okJson(redactSecrets(monitor))
  },
}

const monitorListTool: AnakinTool = {
  name: 'monitor_list',
  description:
    "List your website monitors, or pass `id` to fetch one monitor's full configuration and status (next/last check time, active state, per-check credit cost, alert settings). Use this to find a monitor's id before monitor_changes or monitor_control.",
  annotations: {
    title: 'List website monitors',
    readOnlyHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'Monitor ID — fetch just this monitor instead of the full list.',
      },
    },
    additionalProperties: false,
  },
  handler: async (client, args) => {
    const result =
      typeof args['id'] === 'string'
        ? await client.monitorGet(args['id'])
        : await client.monitorList()
    return okJson(redactSecrets(result))
  },
}

const monitorChangesTool: AnakinTool = {
  name: 'monitor_changes',
  description:
    'Get the detected changes for a monitor — each entry records when the watched content differed from the previous check, with a diff/summary (and the AI change summary when aiMode is on). Use monitor_list first to find the monitor id.',
  annotations: {
    title: 'Get monitor changes',
    readOnlyHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The monitor ID (from monitor_list or monitor_create).',
      },
    },
    required: ['id'],
    additionalProperties: false,
  },
  handler: async (client, args) => {
    const result = await client.monitorChanges(String(args['id']))
    return okJson(redactSecrets(result))
  },
}

const monitorControlTool: AnakinTool = {
  name: 'monitor_control',
  description:
    'Control an existing website monitor: "pause" stops scheduled checks, "resume" restarts them (may hit the plan\'s active-monitor cap), "run_now" triggers an immediate out-of-schedule check (billed like a normal check), and "delete" permanently removes the monitor and its history. Use monitor_list to find the id.',
  annotations: {
    title: 'Control a website monitor',
    // Every verb mutates the monitor (delete irreversibly) → prompt.
    destructiveHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The monitor ID (from monitor_list or monitor_create).',
      },
      action: {
        type: 'string',
        enum: ['pause', 'resume', 'run_now', 'delete'],
        description: 'What to do with the monitor.',
      },
    },
    required: ['id', 'action'],
    additionalProperties: false,
  },
  handler: async (client, args) => {
    const id = String(args['id'])
    const action = String(args['action'])
    if (
      action !== 'pause' &&
      action !== 'resume' &&
      action !== 'run_now' &&
      action !== 'delete'
    ) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `Unknown monitor action "${action}" — use pause, resume, run_now, or delete.`,
          },
        ],
      }
    }
    const result = await client.monitorControl(id, action)
    return okJson(redactSecrets(result))
  },
}

export const monitorTools: AnakinTool[] = [
  monitorCreateTool,
  monitorListTool,
  monitorChangesTool,
  monitorControlTool,
]
