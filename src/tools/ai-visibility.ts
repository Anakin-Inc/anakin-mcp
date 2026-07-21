/**
 * AI Visibility tool family.
 *
 * Fans one query out to multiple AI answer engines (ChatGPT, Gemini, Google
 * AI Overview, …) via Wire's catalogue and compares what each says — brand /
 * SEO teams use it to see how AI engines answer questions about them. The
 * submit endpoint is async; the client polls to a terminal state and returns
 * per-source results either way (a "failed" run still carries the sources
 * that did answer, plus per-source errors).
 *
 * Results include each engine's raw full answer (`full_content`), which is
 * large; it is stripped by default and returned only when the caller opts in
 * — the summary/verdict/synthesis fields answer most questions.
 */

import type { AnakinTool } from './index.js'
import { okJson } from './index.js'

const aiVisibilitySearchTool: AnakinTool = {
  name: 'ai_visibility_search',
  description:
    'Ask multiple AI answer engines (ChatGPT, Gemini, Google AI Overview) the same question and compare their answers. Returns one result per engine — status, an answer summary, latency, credits used, and a consensus/outlier verdict — plus an AI-generated synthesis of where the engines agree and diverge. Async; typically completes within 1–2 minutes and this tool polls to completion. Use for brand/AI-SEO visibility checks ("what do AI engines say about X"), answer comparison, and geo-specific AI answers (set country). Billed per source at that Wire action\'s rate; failed sources are free. Set include_full_content=true only when you need each engine\'s raw full answer — it is large.',
  annotations: {
    title: 'Compare AI engine answers',
    readOnlyHint: true,
    openWorldHint: true,
  },
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The question to ask every engine (max 2000 characters).',
        maxLength: 2000,
      },
      sources: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Engine slugs to query (see ai_visibility_sources). Omit to query all enabled engines.',
      },
      country: {
        type: 'string',
        description:
          'Two-letter ISO country for the search geography (proxy exit). Defaults to "us".',
        default: 'us',
      },
      include_full_content: {
        type: 'boolean',
        description:
          "Include each engine's raw full answer in the results (large). Defaults to false — summaries and the synthesis are returned regardless.",
        default: false,
      },
    },
    required: ['query'],
    additionalProperties: false,
  },
  handler: async (client, args) => {
    const query = String(args['query'])

    const opts: Parameters<typeof client.aiVisibilitySearch>[1] = {}
    if (Array.isArray(args['sources'])) {
      opts.sources = (args['sources'] as unknown[]).map(String)
    }
    if (typeof args['country'] === 'string') opts.country = args['country']

    const search = await client.aiVisibilitySearch(query, opts)

    const includeFull = args['include_full_content'] === true
    const results = (search.results ?? []).map((r) => {
      if (includeFull) return r
      const { full_content: _dropped, ...rest } = r
      return rest
    })

    return okJson({
      search_id: search.search_id,
      status: search.status,
      country: search.country,
      synthesis: search.synthesis,
      results,
    })
  },
}

const aiVisibilitySourcesTool: AnakinTool = {
  name: 'ai_visibility_sources',
  description:
    'List the AI answer engines available to ai_visibility_search — each with its slug (what you pass as `sources`) and display label. Call this when you need to query a subset of engines or check what is currently enabled.',
  annotations: {
    title: 'List AI visibility engines',
    readOnlyHint: true,
    openWorldHint: false,
  },
  inputSchema: {
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
  handler: async (client) => {
    const result = await client.aiVisibilitySources()
    return okJson(result)
  },
}

export const aiVisibilityTools: AnakinTool[] = [
  aiVisibilitySearchTool,
  aiVisibilitySourcesTool,
]
