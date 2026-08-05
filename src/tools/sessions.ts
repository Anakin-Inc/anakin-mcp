/**
 * Browser-session tool family.
 *
 * Saved browser sessions are encrypted login states (cookies + localStorage)
 * created once via the Anakin dashboard or the Browser API, then reused for
 * authenticated work: scrape/crawl `sessionId`, monitor_create `sessionId`,
 * and browser_task `session_id` all take the IDs this tool lists.
 *
 * Creating a session is deliberately NOT exposed here — it is an interactive
 * flow (a live noVNC browser the user logs into, completing 2FA/captchas
 * themselves) that cannot run inside an MCP tool call, and the programmatic
 * path requires driving a CDP WebSocket from Playwright. The tools cover
 * discovery (list) and cleanup (delete).
 */

import type { AnakinTool } from './index.js'
import { okJson } from './index.js'

const sessionListTool: AnakinTool = {
  name: 'session_list',
  description:
    'List your saved browser sessions — encrypted login states captured via the Anakin dashboard or Browser API. Each session\'s id is what you pass as sessionId to scrape/crawl, monitor_create, or browser_task to work with login-protected pages. Optionally filter by the website domain the session belongs to. If no session exists for a site, the user must create one interactively in the dashboard (log in once; 2FA/captchas included) — that flow cannot run from here.',
  annotations: {
    title: 'List saved browser sessions',
    readOnlyHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    type: 'object',
    properties: {
      domain: {
        type: 'string',
        description: 'Filter to sessions for one website domain, e.g. "amazon.com".',
      },
    },
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    properties: {
      sessions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Pass as sessionId/session_id elsewhere.' },
            domain: { type: 'string', description: 'The website domain this session is authenticated for.' },
          },
          required: ['id'],
          additionalProperties: true,
        },
      },
    },
    required: ['sessions'],
    additionalProperties: false,
  },
  handler: async (client, args) => {
    const domain = typeof args['domain'] === 'string' ? args['domain'] : undefined
    const result = await client.sessionsList(domain)
    // client.sessionsList() resolves to an array; CallToolResult.
    // structuredContent must be an object root, so it's wrapped rather than bare.
    return okJson({ sessions: result })
  },
}

const sessionDeleteTool: AnakinTool = {
  name: 'session_delete',
  description:
    'Permanently delete a saved browser session and its encrypted login data. Irreversible — the user must log in again through the dashboard to recreate it, and any monitors or requests referencing this sessionId will lose authenticated access. Find ids with session_list.',
  annotations: {
    title: 'Delete a saved browser session',
    // Irreversibly destroys stored login state → always prompt.
    destructiveHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: 'The session ID to delete (from session_list).',
      },
    },
    required: ['id'],
    additionalProperties: false,
  },
  outputSchema: {
    type: 'object',
    description: 'Confirmation of deletion.',
    additionalProperties: true,
  },
  handler: async (client, args) => {
    const result = await client.sessionDelete(String(args['id']))
    return okJson(result)
  },
}

export const sessionTools: AnakinTool[] = [sessionListTool, sessionDeleteTool]
