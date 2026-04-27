/**
 * Read existing client config (if any), merge in the anakin entry, write back.
 *
 * Strategy: every client we support uses a JSON config with a top-level
 * `mcpServers` object whose keys are server names. We only set/overwrite
 * the `anakin` key — everything else the user has configured is preserved.
 *
 * VS Code is the exception: its workspace config uses `servers` instead of
 * `mcpServers`. We branch on client name for that one.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

import type { ClientName } from './paths.js'

export interface AnakinServerEntry {
  command: string
  args: string[]
  env: { ANAKIN_API_KEY: string }
}

export function buildAnakinEntry(apiKey: string): AnakinServerEntry {
  return {
    command: 'npx',
    args: ['-y', 'anakin-mcp'],
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

/** Merge the anakin entry into the config under the appropriate top-level key. */
function mergeServerEntry(
  client: ClientName,
  config: JsonConfig,
  entry: AnakinServerEntry,
): JsonConfig {
  const key = client === 'vscode' ? 'servers' : 'mcpServers'

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
  const updated = mergeServerEntry(client, existing, entry)

  // No-op if already set to the same shape.
  if (JSON.stringify(existing) === JSON.stringify(updated)) {
    return false
  }

  await writeJson(configFilePath, updated)
  return true
}
