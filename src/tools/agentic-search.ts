import type { AnakinTool } from './index.js'
import { okJson } from './index.js'

export const agenticSearchTool: AnakinTool = {
  name: 'agentic_search',
  description:
    'Run multi-source deep research. The pipeline searches the web, scrapes the most relevant citations, and uses an LLM to structure the combined data into a unified answer. Async — typically 1–5 minutes. Use this when one URL or a flat search result will not answer the question (comparative analysis, multi-jurisdictional research, market intelligence). Returns a summary plus structured_data conforming to the inferred or supplied schema.',
  inputSchema: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'The research question or task in natural language.',
      },
      schema: {
        type: 'object',
        description:
          'Optional JSON Schema describing the desired output shape. If omitted, the engine infers a schema from the prompt.',
        additionalProperties: true,
      },
      useBrowser: {
        type: 'boolean',
        description:
          'Use the headless browser when scraping cited pages (more reliable for JS-heavy sources). Defaults to true.',
        default: true,
      },
    },
    required: ['prompt'],
    additionalProperties: false,
  },
  handler: async (client, args) => {
    const prompt = String(args['prompt'])

    const opts: Parameters<typeof client.agenticSearch>[1] = {
      useBrowser: args['useBrowser'] === undefined ? true : Boolean(args['useBrowser']),
    }
    if (typeof args['schema'] === 'object' && args['schema'] !== null) {
      opts.schema = args['schema'] as Record<string, unknown>
    }

    const result = await client.agenticSearch(prompt, opts)

    return okJson({
      id: result.id,
      status: result.status,
      summary: result.generatedJson?.summary,
      structured_data: result.generatedJson?.structured_data,
      data_schema: result.generatedJson?.data_schema,
      cached: result.cached,
    })
  },
}
