/**
 * MCP server. Started by `anakin-mcp` (default mode) and spawned as a
 * subprocess by Claude Desktop / Cursor / Windsurf / VS Code Codex et al.
 *
 * The server speaks Model Context Protocol over stdio (JSON-RPC). Tools
 * are thin wrappers over `@anakin/sdk` — there is intentionally no
 * scraping logic in this package; this is purely a translation layer.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolResult,
} from '@modelcontextprotocol/sdk/types.js'

import { AnakinClient } from './client.js'
import { tools, dispatchTool } from './tools/index.js'
import { VERSION } from './version.js'

export async function runServer(): Promise<void> {
  const apiKey = process.env['ANAKIN_API_KEY']
  if (!apiKey) {
    throw new Error(
      'ANAKIN_API_KEY is not set. Get a key at https://anakin.io/dashboard ' +
        'and add it to your MCP client config (env.ANAKIN_API_KEY).',
    )
  }

  const client = new AnakinClient({ apiKey })

  const server = new Server(
    {
      name: 'anakin-mcp',
      version: VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  )

  // Advertise the available tools to the client.
  server.setRequestHandler(ListToolsRequestSchema, () => {
    return {
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    }
  })

  // Handle tool invocations.
  server.setRequestHandler(
    CallToolRequestSchema,
    async (request): Promise<CallToolResult> => {
      const { name, arguments: args } = request.params
      return dispatchTool(client, name, args ?? {})
    },
  )

  const transport = new StdioServerTransport()
  await server.connect(transport)
}
