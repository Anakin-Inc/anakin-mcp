import type { AnakinTool } from './index.js'
import { okJson } from './index.js'

export const crawlTool: AnakinTool = {
  name: 'crawl',
  description:
    'Bulk-fetch markdown across a site. Use this when an agent needs the contents of many pages at once (catalog ingestion, site-wide RAG corpus). Pair with includePatterns / excludePatterns to scope which URLs are fetched. Returns an array of pages each with markdown and per-page status.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Starting URL.',
      },
      maxPages: {
        type: 'integer',
        description: 'Hard cap on pages fetched. Defaults to 10.',
        minimum: 1,
        maximum: 500,
        default: 10,
      },
      depth: {
        type: 'integer',
        description: 'Link-hops from the starting URL to follow.',
        minimum: 1,
        maximum: 5,
        default: 1,
      },
      country: {
        type: 'string',
        description: 'Two-letter proxy egress country code.',
        default: 'us',
      },
      useBrowser: {
        type: 'boolean',
        description: 'Render each page in a headless browser (for SPAs).',
        default: false,
      },
      includePatterns: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Glob/regex patterns. Only URLs matching at least one pattern are fetched.',
      },
      excludePatterns: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Glob/regex patterns. URLs matching any pattern are skipped.',
      },
      sessionId: {
        type: 'string',
        description: 'Optional saved-browser-session ID for login-protected sites.',
      },
      sessionName: {
        type: 'string',
        description: 'Optional saved-browser-session name.',
      },
    },
    required: ['url'],
    additionalProperties: false,
  },
  handler: async (client, args) => {
    const url = String(args['url'])

    const opts: Parameters<typeof client.crawl>[1] = {
      maxPages: typeof args['maxPages'] === 'number' ? args['maxPages'] : 10,
      depth: typeof args['depth'] === 'number' ? args['depth'] : 1,
      country: typeof args['country'] === 'string' ? args['country'] : 'us',
      useBrowser: Boolean(args['useBrowser']),
    }
    if (Array.isArray(args['includePatterns'])) {
      opts.includePatterns = args['includePatterns'] as string[]
    }
    if (Array.isArray(args['excludePatterns'])) {
      opts.excludePatterns = args['excludePatterns'] as string[]
    }
    if (typeof args['sessionId'] === 'string') opts.sessionId = args['sessionId']
    if (typeof args['sessionName'] === 'string') opts.sessionName = args['sessionName']

    const result = await client.crawl(url, opts)

    return okJson({
      url: result.url,
      totalPages: result.totalPages,
      completedPages: result.completedPages,
      pages: result.pages,
      durationMs: result.durationMs,
    })
  },
}
