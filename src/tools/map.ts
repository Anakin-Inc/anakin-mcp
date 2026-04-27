import type { AnakinTool } from './index.js'
import { okJson } from './index.js'

export const mapTool: AnakinTool = {
  name: 'map',
  description:
    'Discover all reachable URLs under a given site. Useful for understanding a domain\'s structure before crawling, or finding the sub-pages an agent should scrape. Returns lists of internal links, external links, and counts. Honors depth and limit parameters.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The starting URL for discovery (typically a homepage or section root).',
      },
      limit: {
        type: 'integer',
        description: 'Maximum number of URLs to return overall.',
        minimum: 1,
        maximum: 1000,
        default: 100,
      },
      depth: {
        type: 'integer',
        description: 'How many link-hops from the starting URL to follow.',
        minimum: 1,
        maximum: 5,
        default: 2,
      },
      limitPerLevel: {
        type: 'integer',
        description: 'Maximum URLs collected per depth level (controls breadth).',
        minimum: 1,
        maximum: 1000,
        default: 100,
      },
      includeSubdomains: {
        type: 'boolean',
        description: 'Include URLs on subdomains of the starting host.',
        default: false,
      },
      includeExternalLinks: {
        type: 'boolean',
        description: 'Also collect (but do not follow) external links.',
        default: false,
      },
      useBrowser: {
        type: 'boolean',
        description: 'Render with a headless browser (for SPAs).',
        default: false,
      },
      search: {
        type: 'string',
        description:
          'Optional keyword filter — only return URLs whose path/title matches.',
      },
    },
    required: ['url'],
    additionalProperties: false,
  },
  handler: async (client, args) => {
    const url = String(args['url'])

    const opts: Parameters<typeof client.map>[1] = {
      limit: typeof args['limit'] === 'number' ? args['limit'] : 100,
      depth: typeof args['depth'] === 'number' ? args['depth'] : 2,
      limitPerLevel:
        typeof args['limitPerLevel'] === 'number' ? args['limitPerLevel'] : 100,
      includeSubdomains: Boolean(args['includeSubdomains']),
      includeExternalLinks: Boolean(args['includeExternalLinks']),
      useBrowser: Boolean(args['useBrowser']),
    }
    if (typeof args['search'] === 'string') opts.search = args['search']

    const result = await client.map(url, opts)

    return okJson({
      url: result.url,
      links: result.links,
      totalLinks: result.totalLinks,
      externalLinks: result.externalLinks,
      totalExternalLinks: result.totalExternalLinks,
      durationMs: result.durationMs,
    })
  },
}
