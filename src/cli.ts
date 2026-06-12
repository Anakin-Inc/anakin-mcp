/**
 * Entry point for the `anakin-mcp` binary.
 *
 *   anakin-mcp                — run the MCP server (default; what client tools spawn)
 *   anakin-mcp init           — interactively configure MCP for detected agent clients
 *   anakin-mcp init --all     — skip per-client confirmations; prompts for API key if unset
 *   anakin-mcp init --client=<name>  — only configure one client
 *   anakin-mcp --version      — print version
 *   anakin-mcp --help         — print usage
 */

import { runServer } from './server.js'
import { runInit, runUpdate } from './init/index.js'
import { VERSION } from './version.js'

const HELP = `\
anakin-mcp v${VERSION} — Model Context Protocol server for Anakin

Usage:
  anakin-mcp                       Run the MCP server over stdio (default).
  anakin-mcp init                  Interactively configure MCP for detected
                                   agent clients (Claude Desktop, Claude Code,
                                   Cursor, Cline, Continue, Zed, Windsurf,
                                   VS Code).
  anakin-mcp init --all            Configure every detected client, skip
                                   per-client confirmations. Prompts for
                                   API key if ANAKIN_API_KEY is not set.
  anakin-mcp init --client=<name>  Only configure one client.
                                   Names: claude-desktop, claude-code, cursor,
                                   cline, continue, zed, windsurf, vscode.
  anakin-mcp update                Re-pin configured clients to @latest so they
                                   auto-update. Keeps your API key; no prompts.
  anakin-mcp --version             Print version and exit.
  anakin-mcp --help                Print this help and exit.

Environment:
  ANAKIN_API_KEY   API key for the Anakin API. If not set, init prompts
                   for it. Get a key at https://anakin.io/dashboard.

Docs:
  https://anakin.io/docs/integrations/ai-agents/mcp-server
`

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.includes('--help') || args.includes('-h')) {
    process.stdout.write(HELP)
    return
  }

  if (args.includes('--version') || args.includes('-v')) {
    process.stdout.write(`${VERSION}\n`)
    return
  }

  const subcommand = args[0]

  if (subcommand === 'init') {
    await runInit(args.slice(1))
    return
  }

  if (subcommand === 'update') {
    await runUpdate(args.slice(1))
    return
  }

  if (subcommand !== undefined && !subcommand.startsWith('-')) {
    process.stderr.write(`Unknown subcommand: ${subcommand}\n\n${HELP}`)
    process.exit(2)
  }

  // Default: run the MCP server. This is what Claude Desktop / Cursor /
  // Windsurf / VS Code spawn as a subprocess.
  await runServer()
}

main().catch((err) => {
  // Errors must go to stderr — stdout is reserved for the MCP JSON-RPC stream.
  process.stderr.write(`anakin-mcp: ${err instanceof Error ? err.message : String(err)}\n`)
  if (err instanceof Error && err.stack) process.stderr.write(`${err.stack}\n`)
  process.exit(1)
})
