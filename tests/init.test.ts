/**
 * Unit tests for the init command's plumbing — paths, display names, and
 * the per-client schema-aware merge logic.
 *
 * These cover the parts that have been most prone to bugs historically:
 *   - per-platform config-path resolution (macOS / Linux / Windows)
 *   - the three different "merge a server entry" schemas
 *     (mcpServers / servers / context_servers / Continue array)
 *   - idempotency: re-running with the same input is a no-op
 *
 * Filesystem-touching tests use a tmp dir that's cleaned up per-test.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

import {
  ALL_CLIENTS,
  configPath,
  displayName,
  type ClientName,
} from '../src/init/paths.js'
import {
  buildAnakinEntry,
  writeClientConfig,
  updateClientConfig,
} from '../src/init/clients.js'

describe('paths.ts: client metadata', () => {
  it('lists all 8 supported clients in ALL_CLIENTS', () => {
    expect(ALL_CLIENTS).toEqual([
      'claude-desktop',
      'claude-code',
      'cursor',
      'cline',
      'continue',
      'zed',
      'windsurf',
      'vscode',
    ])
    expect(ALL_CLIENTS).toHaveLength(8)
  })

  it('every client has a non-empty display name', () => {
    for (const client of ALL_CLIENTS) {
      const name = displayName(client)
      expect(name).toBeTruthy()
      expect(name.length).toBeGreaterThan(0)
    }
  })

  it('returns a configPath for every client supported on the current platform', () => {
    // Claude Desktop is unsupported on Linux per its current builds; skip
    // the strict-non-null check there.
    const linuxOnly = (process.platform === 'linux') ? ['claude-desktop'] : []

    for (const client of ALL_CLIENTS) {
      const p = configPath(client)
      if (linuxOnly.includes(client)) {
        expect(p).toBeNull()
      } else {
        expect(p).toBeTruthy()
        expect(typeof p).toBe('string')
        expect((p as string).length).toBeGreaterThan(0)
      }
    }
  })

  it('cross-platform clients (claude-code, cursor) return paths under $HOME', () => {
    const home = os.homedir()
    const code = configPath('claude-code')
    const cursor = configPath('cursor')
    expect(code).toBeTruthy()
    expect(cursor).toBeTruthy()
    expect(code as string).toContain(home)
    expect(cursor as string).toContain(home)
  })
})

describe('clients.ts: buildAnakinEntry', () => {
  it('produces the canonical npx invocation for the published package', () => {
    const entry = buildAnakinEntry('ak-test')
    expect(entry).toEqual({
      command: 'npx',
      args: ['-y', '@anakin-io/mcp@latest'],
      env: { ANAKIN_API_KEY: 'ak-test' },
    })
  })

  it('preserves the API key as-is (no transform, no logging)', () => {
    const key = 'ak-LZpQ4xEf9nvFqQ7q'
    const entry = buildAnakinEntry(key)
    expect(entry.env.ANAKIN_API_KEY).toBe(key)
  })
})

describe('clients.ts: writeClientConfig — schema-aware merge', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'anakin-mcp-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('creates a config file with mcpServers schema (Cursor / Claude family)', async () => {
    const file = path.join(tmpDir, 'mcp.json')
    const wrote = await writeClientConfig('cursor', file, 'ak-1')
    expect(wrote).toBe(true)

    const config = JSON.parse(await fs.readFile(file, 'utf8')) as {
      mcpServers?: { anakin?: { args: string[]; env: { ANAKIN_API_KEY: string } } }
    }
    expect(config.mcpServers?.anakin).toBeTruthy()
    expect(config.mcpServers?.anakin?.args).toEqual(['-y', '@anakin-io/mcp@latest'])
    expect(config.mcpServers?.anakin?.env.ANAKIN_API_KEY).toBe('ak-1')
  })

  it('uses the `servers` (not `mcpServers`) key for VS Code workspace config', async () => {
    const file = path.join(tmpDir, 'mcp.json')
    await writeClientConfig('vscode', file, 'ak-2')

    const config = JSON.parse(await fs.readFile(file, 'utf8')) as Record<string, unknown>
    expect(config['servers']).toBeTruthy()
    expect(config['mcpServers']).toBeUndefined()
  })

  it('uses the `context_servers` key for Zed', async () => {
    const file = path.join(tmpDir, 'settings.json')
    await writeClientConfig('zed', file, 'ak-3')

    const config = JSON.parse(await fs.readFile(file, 'utf8')) as Record<string, unknown>
    expect(config['context_servers']).toBeTruthy()
    expect(config['mcpServers']).toBeUndefined()
  })

  it('writes Continue as an array entry under experimental.modelContextProtocolServers', async () => {
    const file = path.join(tmpDir, 'config.json')
    await writeClientConfig('continue', file, 'ak-4')

    const config = JSON.parse(await fs.readFile(file, 'utf8')) as {
      experimental?: { modelContextProtocolServers?: Array<{ name: string }> }
    }
    const arr = config.experimental?.modelContextProtocolServers ?? []
    expect(Array.isArray(arr)).toBe(true)
    expect(arr).toHaveLength(1)
    expect(arr[0]?.name).toBe('anakin')
  })

  it('preserves user-configured servers under the same top-level key', async () => {
    const file = path.join(tmpDir, 'mcp.json')
    const existing = {
      mcpServers: {
        'other-server': {
          command: 'node',
          args: ['/path/to/other'],
          env: {},
        },
      },
    }
    await fs.writeFile(file, JSON.stringify(existing, null, 2))

    await writeClientConfig('cursor', file, 'ak-5')

    const config = JSON.parse(await fs.readFile(file, 'utf8')) as {
      mcpServers: Record<string, unknown>
    }
    expect(Object.keys(config.mcpServers).sort()).toEqual(['anakin', 'other-server'])
  })

  it('Continue dedupes by name when the entry already exists (idempotent on array form)', async () => {
    const file = path.join(tmpDir, 'config.json')
    // First write
    await writeClientConfig('continue', file, 'ak-6')
    // Second write with same key — should NOT duplicate the anakin entry
    await writeClientConfig('continue', file, 'ak-6')

    const config = JSON.parse(await fs.readFile(file, 'utf8')) as {
      experimental: { modelContextProtocolServers: Array<{ name: string }> }
    }
    const anakinEntries = config.experimental.modelContextProtocolServers.filter(
      (e) => e.name === 'anakin',
    )
    expect(anakinEntries).toHaveLength(1)
  })

  it('returns false on second-call no-op (object-style schemas)', async () => {
    const file = path.join(tmpDir, 'mcp.json')
    const first = await writeClientConfig('cursor', file, 'ak-7')
    const second = await writeClientConfig('cursor', file, 'ak-7')
    expect(first).toBe(true)
    expect(second).toBe(false) // no change → no rewrite
  })

  it('preserves non-mcpServers top-level keys in the file', async () => {
    const file = path.join(tmpDir, 'mcp.json')
    const existing = {
      $schema: 'https://example.com/schema.json',
      mcpServers: {},
      otherUserSetting: 'preserve me',
    }
    await fs.writeFile(file, JSON.stringify(existing, null, 2))

    await writeClientConfig('cursor', file, 'ak-8')

    const config = JSON.parse(await fs.readFile(file, 'utf8')) as Record<string, unknown>
    expect(config['$schema']).toBe('https://example.com/schema.json')
    expect(config['otherUserSetting']).toBe('preserve me')
  })

  it('creates parent directories that do not exist yet', async () => {
    const deep = path.join(tmpDir, 'never', 'created', 'before', 'mcp.json')
    const wrote = await writeClientConfig('cursor', deep, 'ak-9')
    expect(wrote).toBe(true)
    const config = JSON.parse(await fs.readFile(deep, 'utf8')) as {
      mcpServers: { anakin: { env: { ANAKIN_API_KEY: string } } }
    }
    expect(config.mcpServers.anakin.env.ANAKIN_API_KEY).toBe('ak-9')
  })
})

describe('clients.ts: updateClientConfig — re-pin to @latest', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'anakin-mcp-upd-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('re-pins a bare `@anakin-io/mcp` to @latest and PRESERVES the API key (no prompt)', async () => {
    const file = path.join(tmpDir, 'mcp.json')
    await fs.writeFile(
      file,
      JSON.stringify({
        mcpServers: {
          anakin: {
            command: 'npx',
            args: ['-y', '@anakin-io/mcp'],
            env: { ANAKIN_API_KEY: 'ak-keep-me' },
          },
        },
      }),
    )

    const result = await updateClientConfig('cursor', file)
    expect(result).toBe('updated')

    const config = JSON.parse(await fs.readFile(file, 'utf8')) as {
      mcpServers: { anakin: { args: string[]; env: { ANAKIN_API_KEY: string } } }
    }
    expect(config.mcpServers.anakin.args).toEqual(['-y', '@anakin-io/mcp@latest'])
    // The key is carried over untouched — update never re-prompts.
    expect(config.mcpServers.anakin.env.ANAKIN_API_KEY).toBe('ak-keep-me')
  })

  it('re-pins an old pinned version (`@0.1.2`) to @latest', async () => {
    const file = path.join(tmpDir, 'mcp.json')
    await fs.writeFile(
      file,
      JSON.stringify({
        mcpServers: {
          anakin: { command: 'npx', args: ['-y', '@anakin-io/mcp@0.1.2'], env: {} },
        },
      }),
    )
    const result = await updateClientConfig('cursor', file)
    expect(result).toBe('updated')
    const config = JSON.parse(await fs.readFile(file, 'utf8')) as {
      mcpServers: { anakin: { args: string[] } }
    }
    expect(config.mcpServers.anakin.args).toEqual(['-y', '@anakin-io/mcp@latest'])
  })

  it('is a no-op when already pinned to @latest', async () => {
    const file = path.join(tmpDir, 'mcp.json')
    await fs.writeFile(
      file,
      JSON.stringify({
        mcpServers: {
          anakin: { command: 'npx', args: ['-y', '@anakin-io/mcp@latest'], env: {} },
        },
      }),
    )
    const result = await updateClientConfig('cursor', file)
    expect(result).toBe('already-latest')
  })

  it('returns not-configured when there is no anakin entry (or no file)', async () => {
    const missing = path.join(tmpDir, 'absent.json')
    expect(await updateClientConfig('cursor', missing)).toBe('not-configured')

    const file = path.join(tmpDir, 'mcp.json')
    await fs.writeFile(file, JSON.stringify({ mcpServers: { other: {} } }))
    expect(await updateClientConfig('cursor', file)).toBe('not-configured')
  })

  it('updates the Continue array entry while preserving its key', async () => {
    const file = path.join(tmpDir, 'config.json')
    await fs.writeFile(
      file,
      JSON.stringify({
        experimental: {
          modelContextProtocolServers: [
            { name: 'other', command: 'node', args: ['x'] },
            {
              name: 'anakin',
              command: 'npx',
              args: ['-y', '@anakin-io/mcp'],
              env: { ANAKIN_API_KEY: 'ak-cont' },
            },
          ],
        },
      }),
    )

    const result = await updateClientConfig('continue', file)
    expect(result).toBe('updated')

    const config = JSON.parse(await fs.readFile(file, 'utf8')) as {
      experimental: {
        modelContextProtocolServers: Array<{
          name: string
          args?: string[]
          env?: { ANAKIN_API_KEY?: string }
        }>
      }
    }
    const anakin = config.experimental.modelContextProtocolServers.find(
      (s) => s.name === 'anakin',
    )
    expect(anakin?.args).toEqual(['-y', '@anakin-io/mcp@latest'])
    expect(anakin?.env?.ANAKIN_API_KEY).toBe('ak-cont')
    // Other entries are left intact.
    expect(config.experimental.modelContextProtocolServers).toHaveLength(2)
  })
})
