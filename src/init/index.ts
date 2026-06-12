/**
 * `anakin-mcp init` — auto-configure detected agent clients.
 *
 * Default mode: detect every supported client, ask the user before writing
 * each (Y/n). With --all, skip the per-client confirmations. With
 * --client=<name>, only configure one specific client.
 *
 * The user's API key is taken from $ANAKIN_API_KEY. If unset, the command
 * always prompts for it — regardless of --all mode.
 */

import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import fs from 'node:fs/promises'
import path from 'node:path'

import { ALL_CLIENTS, configPath, displayName, type ClientName } from './paths.js'
import { writeClientConfig, updateClientConfig } from './clients.js'

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
  anakin-mcp init --client=continue        Only configure Continue (IDE extension)
  anakin-mcp init --client=zed             Only configure Zed editor
  anakin-mcp init --client=windsurf        Only configure Windsurf
  anakin-mcp init --client=vscode          Only configure VS Code (workspace .vscode/mcp.json)

Environment:
  ANAKIN_API_KEY   API key. If not set, the command always prompts for it.
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

async function getApiKey(): Promise<string> {
  const fromEnv = process.env['ANAKIN_API_KEY']
  if (fromEnv) return fromEnv

  const rl = readline.createInterface({ input, output })
  process.stdout.write(
    'anakin-mcp: ANAKIN_API_KEY is not set.\n' +
    'Get a key at https://anakin.io/dashboard\n\n',
  )
  const answer = await rl.question(
    'Paste your API key: ',
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
  const apiKey = await getApiKey()
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

/** Parse `update` args — only a `--client=` filter (repeatable) and help. */
function parseUpdateClients(args: string[]): ClientName[] | null {
  let clients: ClientName[] | null = null
  for (const arg of args) {
    if (arg.startsWith('--client=')) {
      const name = arg.slice('--client='.length) as ClientName
      if (!ALL_CLIENTS.includes(name)) {
        throw new Error(`Unknown client: ${name}. Supported: ${ALL_CLIENTS.join(', ')}`)
      }
      clients = [...(clients ?? []), name]
    } else if (arg === '--help' || arg === '-h') {
      process.stdout.write(`\
anakin-mcp update — re-pin configured clients to @anakin-io/mcp@latest

Rewrites each client's existing anakin entry to pin @latest so npx fetches new
releases automatically. Keeps your API key — never prompts.

Usage:
  anakin-mcp update                  Update every detected client
  anakin-mcp update --client=cursor  Only update one client
`)
      process.exit(0)
    } else {
      throw new Error(`Unknown update option: ${arg}`)
    }
  }
  return clients
}

/**
 * `anakin-mcp update` — re-point already-configured clients at
 * `@anakin-io/mcp@latest` so they auto-update on the next restart. Unlike
 * init, this preserves the API key already in each config and never prompts.
 */
export async function runUpdate(args: string[]): Promise<void> {
  const filter = parseUpdateClients(args)
  const detected = await detectClients(filter)

  let updated = 0
  let current = 0

  for (const { client, configFilePath } of detected) {
    const result = await updateClientConfig(client, configFilePath)
    const label = displayName(client)
    if (result === 'updated') {
      process.stdout.write(`✓ ${label}: re-pinned to @latest\n`)
      updated++
    } else if (result === 'already-latest') {
      process.stdout.write(`• ${label}: already on @latest\n`)
      current++
    }
    // 'not-configured' → silent unless a specific client was requested
    else if (filter) {
      process.stdout.write(`– ${label}: no anakin entry found (run \`anakin-mcp init\`)\n`)
    }
  }

  if (updated + current === 0) {
    process.stdout.write(
      'No anakin entries found to update. Run `anakin-mcp init` to set one up.\n',
    )
    return
  }

  process.stdout.write(
    `\nUpdated ${updated} config(s)${current > 0 ? `, ${current} already current` : ''}.\n` +
      'Restart your client(s) to load the latest version.\n',
  )
}
