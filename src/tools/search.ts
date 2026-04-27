import type { AnakinTool } from './index.js'
import { okJson } from './index.js'

export const searchTool: AnakinTool = {
  name: 'search',
  description:
    'Run an AI web search and return result URLs, titles, and snippets. Synchronous — returns immediately, no polling. Use this when the agent needs to discover pages relevant to a query before scraping. Returns a results array with url/title/snippet/date for each hit.',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'The search query in natural language.',
      },
      limit: {
        type: 'integer',
        description: 'Maximum number of results to return.',
        minimum: 1,
        maximum: 20,
        default: 5,
      },
    },
    required: ['prompt'],
    additionalProperties: false,
  },
  handler: async (client, args) => {
    const prompt = String(args['prompt'])
    const limit = typeof args['limit'] === 'number' ? args['limit'] : 5

    const result = await client.search(prompt, { limit })

    return okJson({
      results: result.results,
      count: result.results.length,
    })
  },
}
