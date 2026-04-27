/**
 * Per-platform config-file paths for each MCP-aware agent client.
 *
 * Sources (verified Apr 2026):
 *   - Claude Desktop:
 *       https://modelcontextprotocol.io/quickstart/user
 *       macOS:   ~/Library/Application Support/Claude/claude_desktop_config.json
 *       Windows: %APPDATA%/Claude/claude_desktop_config.json
 *       (Linux: not officially supported yet — left out)
 *   - Claude Code (Anthropic CLI):
 *       https://docs.anthropic.com/en/docs/claude-code/mcp
 *       ~/.claude/settings.json (user-scoped global)
 *       Same `mcpServers` schema as Claude Desktop.
 *   - Cursor:
 *       https://docs.cursor.com/context/model-context-protocol
 *       Project-scoped: ./.cursor/mcp.json
 *       User-scoped:    ~/.cursor/mcp.json
 *   - Cline (VS Code extension, "Claude Dev"):
 *       https://docs.cline.bot/mcp-servers/configuring-mcp-servers
 *       Stored in VS Code's extension globalStorage:
 *         macOS:   ~/Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
 *         Windows: %APPDATA%/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
 *         Linux:   ~/.config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json
 *       (Same `mcpServers` schema as Claude family.)
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

export type ClientName =
  | 'claude-desktop'
  | 'claude-code'
  | 'cursor'
  | 'cline'
  | 'continue'
  | 'zed'
  | 'windsurf'
  | 'vscode'

export const ALL_CLIENTS: ClientName[] = [
  'claude-desktop',
  'claude-code',
  'cursor',
  'cline',
  'continue',
  'zed',
  'windsurf',
  'vscode',
]

/**
 * Per-platform path to the user's VS Code globalStorage directory. Used by
 * the Cline writer (Cline lives inside VS Code as an extension).
 */
function vscodeGlobalStorageDir(home: string, platform: NodeJS.Platform): string {
  if (platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage')
  }
  if (platform === 'win32') {
    const appData = process.env['APPDATA'] ?? path.join(home, 'AppData', 'Roaming')
    return path.join(appData, 'Code', 'User', 'globalStorage')
  }
  // Linux + others
  return path.join(home, '.config', 'Code', 'User', 'globalStorage')
}

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

    case 'claude-code':
      // Anthropic's CLI agent — settings live under ~/.claude regardless
      // of platform. Cross-platform identical, including Linux.
      return path.join(home, '.claude', 'settings.json')

    case 'cursor':
      return path.join(home, '.cursor', 'mcp.json')

    case 'cline':
      return path.join(
        vscodeGlobalStorageDir(home, platform),
        'saoudrizwan.claude-dev',
        'settings',
        'cline_mcp_settings.json',
      )

    case 'continue':
      // Continue's JSON config. (Newer Continue versions support a YAML
      // form too, at ~/.continue/config.yaml — we target the JSON form
      // because (a) it's still supported and (b) it doesn't require a
      // YAML parser dependency.)
      return path.join(home, '.continue', 'config.json')

    case 'zed':
      if (platform === 'win32') {
        const appData = process.env['APPDATA'] ?? path.join(home, 'AppData', 'Roaming')
        return path.join(appData, 'Zed', 'settings.json')
      }
      // macOS and Linux: ~/.config/zed/settings.json
      return path.join(home, '.config', 'zed', 'settings.json')

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
    case 'claude-code':
      return 'Claude Code'
    case 'cursor':
      return 'Cursor'
    case 'cline':
      return 'Cline (VS Code extension)'
    case 'continue':
      return 'Continue (IDE extension)'
    case 'zed':
      return 'Zed'
    case 'windsurf':
      return 'Windsurf'
    case 'vscode':
      return 'VS Code'
  }
}
