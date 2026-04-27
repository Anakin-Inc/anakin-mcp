/**
 * Per-platform config-file paths for each MCP-aware agent client.
 *
 * Sources (verified Apr 2026):
 *   - Claude Desktop:
 *       https://modelcontextprotocol.io/quickstart/user
 *       macOS:   ~/Library/Application Support/Claude/claude_desktop_config.json
 *       Windows: %APPDATA%/Claude/claude_desktop_config.json
 *       (Linux: not officially supported yet — left out)
 *   - Cursor:
 *       https://docs.cursor.com/context/model-context-protocol
 *       Project-scoped: ./.cursor/mcp.json
 *       User-scoped:    ~/.cursor/mcp.json
 *   - Windsurf:
 *       https://docs.windsurf.com/windsurf/cascade/mcp
 *       ~/.codeium/windsurf/mcp_config.json
 *   - VS Code (with the MCP extension):
 *       https://code.visualstudio.com/docs/copilot/copilot-mcp
 *       User settings: settings.json under "mcp" key
 *       Workspace:     .vscode/mcp.json
 *       (We use the workspace file when run from a project directory; user
 *        settings would require live-editing a structured JSON-with-comments
 *        file, which is fragile.)
 */

import os from 'node:os'
import path from 'node:path'

export type ClientName = 'claude-desktop' | 'cursor' | 'windsurf' | 'vscode'

export const ALL_CLIENTS: ClientName[] = [
  'claude-desktop',
  'cursor',
  'windsurf',
  'vscode',
]

/** Returns the config path for a given client on the current platform, or null if unsupported. */
export function configPath(client: ClientName): string | null {
  const home = os.homedir()
  const platform = process.platform

  switch (client) {
    case 'claude-desktop':
      if (platform === 'darwin') {
        return path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
      }
      if (platform === 'win32') {
        const appData = process.env['APPDATA'] ?? path.join(home, 'AppData', 'Roaming')
        return path.join(appData, 'Claude', 'claude_desktop_config.json')
      }
      // Linux is not officially supported by Claude Desktop yet.
      return null

    case 'cursor':
      return path.join(home, '.cursor', 'mcp.json')

    case 'windsurf':
      return path.join(home, '.codeium', 'windsurf', 'mcp_config.json')

    case 'vscode':
      // Use the project-local VS Code MCP file. Users can also configure
      // user-scoped settings, but doing that programmatically is fragile.
      return path.join(process.cwd(), '.vscode', 'mcp.json')
  }
}

/** Pretty-prints the client's display name. */
export function displayName(client: ClientName): string {
  switch (client) {
    case 'claude-desktop':
      return 'Claude Desktop'
    case 'cursor':
      return 'Cursor'
    case 'windsurf':
      return 'Windsurf'
    case 'vscode':
      return 'VS Code'
  }
}
