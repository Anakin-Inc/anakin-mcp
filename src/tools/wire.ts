import type { AnakinTool } from './index.js'
import { okJson } from './index.js'

export const wireTool: AnakinTool = {
  name: 'wire_action',
  description:
    'Execute a pre-built website action via Wire (Anakin\'s action catalog). Wire actions are vetted, named workflows for tasks like "log into <site>", "fill checkout form", "submit job application", or "extract dashboard metrics". Each action has a fixed shape of params it accepts. Use this when an agent needs to interact with a site (clicks, forms, login flows) rather than just read content. The catalog of available actions is at https://anakin.io/docs/api-reference/holocron.',
  inputSchema: {
    type: 'object',
    properties: {
      action_id: {
        type: 'string',
        description:
          'The Wire action identifier (e.g. "linkedin_login", "checkout_amazon"). Browse the catalog for available action IDs.',
      },
      params: {
        type: 'object',
        description:
          'The parameters this action requires. Shape depends on the action — see the action\'s spec page in the catalog.',
        additionalProperties: true,
      },
    },
    required: ['action_id', 'params'],
    additionalProperties: false,
  },
  handler: async (client, args) => {
    const actionId = String(args['action_id'])
    const params = (args['params'] ?? {}) as Record<string, unknown>

    const result = await client.wire(actionId, params)

    return okJson(result)
  },
}
