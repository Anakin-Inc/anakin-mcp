import type { AnakinTool } from './index.js'
import { ok, okJson } from './index.js'

export const scrapeTool: AnakinTool = {
  name: 'scrape',
  description:
    'Fetch a single URL and return clean markdown by default. Set generateJson=true to also extract structured data with AI. Set useBrowser=true for SPAs and JS-heavy sites (slower and more expensive — only when needed). Returns markdown unless generateJson is true, in which case it returns the structured JSON.',
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to scrape.',
      },
      generateJson: {
        type: 'boolean',
        description:
          'Have AI extract structured JSON from the page in addition to / instead of markdown. Use for product pages, listings, articles, anywhere the caller wants typed fields.',
        default: false,
      },
      useBrowser: {
        type: 'boolean',
        description:
          'Render the page with a stealth headless browser. Required for SPAs and dynamic content; otherwise prefer the default (fetch-based) for speed and lower cost.',
        default: false,
      },
      country: {
        type: 'string',
        description:
          'Two-letter country code for the proxy egress location (e.g. "us", "de", "in"). Defaults to "us".',
        default: 'us',
      },
      sessionId: {
        type: 'string',
        description:
          'Optional saved-browser-session ID for login-protected pages. Pair with useBrowser=true.',
      },
      sessionName: {
        type: 'string',
        description:
          'Optional saved-browser-session name (alternative to sessionId).',
      },
      forceFresh: {
        type: 'boolean',
        description:
          'Skip the cache and refetch. Defaults to false; cached results are typically good for 24h.',
        default: false,
      },
    },
    required: ['url'],
    additionalProperties: false,
  },
  handler: async (client, args) => {
    const url = String(args['url'])
    const generateJson = Boolean(args['generateJson'])
    const useBrowser = Boolean(args['useBrowser'])

    const opts: Parameters<typeof client.scrape>[1] = {
      formats: generateJson ? ['markdown', 'json'] : ['markdown'],
      generateJson,
      useBrowser,
      country: typeof args['country'] === 'string' ? args['country'] : 'us',
      forceFresh: Boolean(args['forceFresh']),
    }
    if (typeof args['sessionId'] === 'string') opts.sessionId = args['sessionId']
    if (typeof args['sessionName'] === 'string') opts.sessionName = args['sessionName']

    const doc = await client.scrape(url, opts)

    // If structured JSON was requested, prefer that as the primary output.
    if (generateJson && doc.generatedJson) {
      return okJson({
        url: doc.url,
        markdown: doc.markdown,
        generatedJson: doc.generatedJson,
        cached: doc.cached,
        durationMs: doc.durationMs,
      })
    }

    return ok(doc.markdown ?? '')
  },
}
