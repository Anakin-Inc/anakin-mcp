/**
 * `anakin-mcp init` — auto-configure detected agent clients.
 *
 * Default mode: detect every supported client, ask the user before writing
 * each (Y/n). With --all, skip the prompts. With --client=<name>, only
 * configure one specific client.
 *
 * The user's API key is taken from $ANAKIN_API_KEY. If unset, the command
 * prompts for one (interactively) or exits with instructions (--all).
 */

import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import fs from 'node:fs/promises'
import path from 'node:path'

import { ALL_CLIENTS, configPath, displayName, type ClientName } from './paths.js'
import { writeClientConfig } from './clients.js'

interface InitOptions {
  all: boolean
  clients: ClientName[] | null
}

function parseArgs(args: string[]): InitOptions {
  const opts: InitOptions = { all: false, clients: null }
  for (const arg of args) {
    if (arg === '--all') {
      opts.all = true
    } else if (arg.startsWith('--client=')) {
      const name = arg.slice('--client='.length) as ClientName
      if (!ALL_CLIENTS.includes(name)) {
        throw new Error(
          `Unknown client: ${name}. Supported: ${ALL_CLIENTS.join(', ')}`,
        )
      }
      opts.clients = [...(opts.clients ?? []), name]
    } else if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    } else {
      throw new Error(`Unknown init option: ${arg}`)
    }
  }
  return opts
}

function printHelp(): void {
  process.stdout.write(`\
anakin-mcp init — configure MCP for detected agent clients

Usage:
  anakin-mcp init                          Interactive (prompts before each write)
  anakin-mcp init --all                    Configure every detected client, no prompts
  anakin-mcp init --client=claude-desktop  Only configure Claude Desktop
  anakin-mcp init --client=claude-code     Only configure Claude Code (Anthropic CLI)
  anakin-mcp init --client=cursor          Only configure Cursor
  anakin-mcp init --client=cline           Only configure Cline (VS Code extension)
  anakin-mcp init --client=windsurf        Only configure Windsurf
  anakin-mcp init --client=vscode          Only configure VS Code (workspace .vscode/mcp.json)

Environment:
  ANAKIN_API_KEY   If set, used as the API key. Otherwise the command prompts.
`)
}

/** Detect which client config dirs exist. Returns clients with their writable paths. */
async function detectClients(
  clientFilter: ClientName[] | null,
): Promise<Array<{ client: ClientName; configFilePath: string; existed: boolean }>> {
  const candidates = clientFilter ?? ALL_CLIENTS
  const detected: Array<{ client: ClientName; configFilePath: string; existed: boolean }> = []

  for (const client of candidates) {
    const filePath = configPath(client)
    if (filePath === null) continue // unsupported on this platform

    // We treat a client as "detected" if EITHER the config file exists OR its
    // parent directory exists (which means the app is installed but hasn't
    // written its config yet).
    let existed = false
    try {
      await fs.access(filePath)
      existed = true
    } catch {
      // File doesn't exist — check parent dir.
      try {
        await fs.access(path.dirname(filePath))
      } catch {
        if (clientFilter === null) continue // skip un-installed clients on auto-detect
      }
    }

    detected.push({ client, configFilePath: filePath, existed })
  }

  return detected
}

async function getApiKey(allMode: boolean): Promise<string> {
  const fromEnv = process.env['ANAKIN_API_KEY']
  if (fromEnv) return fromEnv

  if (allMode) {
    throw new Error(
      'ANAKIN_API_KEY is not set. Either export it before running, or run ' +
        '`anakin-mcp init` (without --all) for an interactive prompt.\n\n' +
        'Get a key at https://anakin.io/dashboard.',
    )
  }

  const rl = readline.createInterface({ input, output })
  const answer = await rl.question(
    'ANAKIN_API_KEY (paste from https://anakin.io/dashboard): ',
  )
  rl.close()
  const trimmed = answer.trim()
  if (!trimmed) throw new Error('No API key provided. Aborting.')
  return trimmed
}

async function confirm(rl: readline.Interface, question: string): Promise<boolean> {
  const answer = (await rl.question(`${question} [Y/n] `)).trim().toLowerCase()
  return answer === '' || answer === 'y' || answer === 'yes'
}

export async function runInit(args: string[]): Promise<void> {
  const opts = parseArgs(args)
  const apiKey = await getApiKey(opts.all)
  const detected = await detectClients(opts.clients)

  if (detected.length === 0) {
    process.stdout.write(
      'No supported MCP clients detected on this machine.\n\n' +
        'Install one of: Claude Desktop, Cursor, Windsurf, or VS Code,\n' +
        'then re-run `anakin-mcp init`.\n',
    )
    return
  }

  const rl = !opts.all ? readline.createInterface({ input, output }) : null

  let configured = 0
  let skipped = 0

  for (const { client, configFilePath, existed } of detected) {
    const label = displayName(client)
    process.stdout.write(`\n${label} → ${configFilePath}${existed ? '' : ' (will create)'}\n`)

    if (rl) {
      const yes = await confirm(rl, `  Configure ${label}?`)
      if (!yes) {
        process.stdout.write('  Skipped.\n')
        skipped++
        continue
      }
    }

    const wrote = await writeClientConfig(client, configFilePath, apiKey)
    if (wrote) {
      process.stdout.write('  ✓ Wrote anakin entry.\n')
      configured++
    } else {
      process.stdout.write('  ✓ Already configured (no change).\n')
    }
  }

  rl?.close()

  process.stdout.write(
    `\nDone. Configured ${configured} client(s)${skipped > 0 ? `, skipped ${skipped}` : ''}.\n`,
  )
  process.stdout.write(
    'Restart your client(s) for the change to take effect.\n',
  )
}
