/**
 * Read existing client config (if any), merge in the anakin entry, write back.
 *
 * Six of our eight supported clients use the standard JSON-object shape:
 *
 *   {
 *     "<top-level-key>": {
 *       "anakin": { "command": "...", "args": [...], "env": { ... } },
 *       ... (other servers preserved)
 *     }
 *   }
 *
 * The top-level key is `mcpServers` for most (Claude Desktop, Claude Code,
 * Cursor, Cline, Windsurf), `servers` for VS Code workspace MCP, and
 * `context_servers` for Zed.
 *
 * Continue is the outlier — it stores MCP servers as an ARRAY at
 * `experimental.modelContextProtocolServers`, with each entry carrying
 * its own `name` field. Same effect, different shape.
 *
 * In every case we preserve any other servers the user has already
 * configured — we only touch the `anakin` entry.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

import type { ClientName } from './paths.js'

export interface AnakinServerEntry {
  command: string
  args: string[]
  env: { ANAKIN_API_KEY: string }
}

export interface AnakinServerEntryV2 extends AnakinServerEntry {
  type: 'stdio'
}

export function buildAnakinEntry(apiKey: string): AnakinServerEntry {
  return {
    command: 'npx',
    args: ['-y', '@anakin-io/mcp@latest'],
    env: { ANAKIN_API_KEY: apiKey },
  }
}

export function buildAnakinEntryV2(apiKey: string): AnakinServerEntryV2 {
  return {
    type: 'stdio',
    command: 'npx',
    args: ['-y', '@anakin-io/mcp@latest'],
    env: { ANAKIN_API_KEY: apiKey },
  }
}

interface JsonConfig {
  [key: string]: unknown
}

async function readJson(file: string): Promise<JsonConfig> {
  try {
    const raw = await fs.readFile(file, 'utf8')
    if (!raw.trim()) return {}
    return JSON.parse(raw) as JsonConfig
  } catch (err) {
    const e = err as NodeJS.ErrnoException
    if (e.code === 'ENOENT') return {}
    throw new Error(`Failed to read existing config at ${file}: ${e.message}`)
  }
}

async function writeJson(file: string, config: JsonConfig): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, JSON.stringify(config, null, 2) + '\n', 'utf8')
}

/** Top-level key the client uses to store its MCP servers as an object. */
function objectStyleKey(client: ClientName): string | null {
  switch (client) {
    case 'claude-desktop':
    case 'cursor':
    case 'cline':
    case 'windsurf':
      return 'mcpServers'
    case 'vscode':
      return 'servers'
    case 'zed':
      return 'context_servers'
    case 'continue':
    case 'claude-code':
      return null // handled separately
  }
}

/**
 * Claude Code v2+: MCPs live at projects[cwd].mcpServers in ~/.claude.json.
 * The entry includes type:"stdio" to match what `claude mcp add` writes.
 */
function mergeClaudeCode(config: JsonConfig, apiKey: string): JsonConfig {
  const cwd = process.cwd()
  const projects = (config['projects'] ?? {}) as JsonConfig
  const project = (projects[cwd] ?? {}) as JsonConfig
  const mcpServers = (project['mcpServers'] ?? {}) as JsonConfig

  return {
    ...config,
    projects: {
      ...projects,
      [cwd]: {
        ...project,
        mcpServers: {
          ...mcpServers,
          anakin: buildAnakinEntryV2(apiKey),
        },
      },
    },
  }
}

/** Merge for clients that use { <key>: { anakin: entry, ... } }. */
function mergeObjectStyle(
  config: JsonConfig,
  key: string,
  entry: AnakinServerEntry,
): JsonConfig {
  const existing = (config[key] ?? {}) as JsonConfig
  return {
    ...config,
    [key]: {
      ...existing,
      anakin: entry,
    },
  }
}

/**
 * Continue stores MCP servers as an array under
 * `experimental.modelContextProtocolServers`. Each entry has a `name` field
 * we use to dedupe when the user already had `anakin` configured.
 */
function mergeContinue(config: JsonConfig, entry: AnakinServerEntry): JsonConfig {
  const continueEntry = {
    name: 'anakin',
    command: entry.command,
    args: entry.args,
    env: entry.env,
  }

  const experimental = (config['experimental'] ?? {}) as JsonConfig
  const existingArray = experimental['modelContextProtocolServers']
  const servers = Array.isArray(existingArray)
    ? (existingArray as Array<{ name?: string }>)
    : []

  const filtered = servers.filter((s) => s?.name !== 'anakin')
  const updated = [...filtered, continueEntry]

  return {
    ...config,
    experimental: {
      ...experimental,
      modelContextProtocolServers: updated,
    },
  }
}

/** Merge the anakin entry into the config using the right schema for the client. */
function mergeServerEntry(
  client: ClientName,
  config: JsonConfig,
  entry: AnakinServerEntry,
  apiKey: string,
): JsonConfig {
  if (client === 'continue') return mergeContinue(config, entry)
  if (client === 'claude-code') return mergeClaudeCode(config, apiKey)
  const key = objectStyleKey(client)
  if (key === null) {
    throw new Error(`No merge strategy defined for client: ${client}`)
  }
  return mergeObjectStyle(config, key, entry)
}

/**
 * Update the client's config file with the anakin entry. Returns true if
 * a write happened, false if the entry was already present and unchanged.
 */
export async function writeClientConfig(
  client: ClientName,
  configFilePath: string,
  apiKey: string,
): Promise<boolean> {
  const entry = buildAnakinEntry(apiKey)
  const existing = await readJson(configFilePath)
  const updated = mergeServerEntry(client, existing, entry, apiKey)

  // No-op if already set to the same shape.
  if (JSON.stringify(existing) === JSON.stringify(updated)) {
    return false
  }

  await writeJson(configFilePath, updated)
  return true
}
