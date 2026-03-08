/**
 * Platform-aware path resolution for all editor adapters.
 *
 * All OS-specific directory logic lives here.  Individual adapters
 * import from this module instead of scattering process.platform checks
 * or hardcoded paths throughout the codebase.
 *
 * Convention used throughout:
 *   darwin  = macOS
 *   win32   = Windows (any bitness)
 *   default = Linux (and other POSIX systems)
 */

'use strict';

const path = require('path');
const os   = require('os');

const HOME     = os.homedir();
const PLATFORM = process.platform; // 'darwin' | 'linux' | 'win32'

// ─────────────────────────────────────────────────────────────────────────────
// Directory helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Config directory for VS Code-style apps (Roaming profile on Windows).
 *
 *   macOS:   ~/Library/Application Support/{appName}
 *   Windows: %APPDATA%/{appName}           (Roaming – persists across machines)
 *   Linux:   $XDG_CONFIG_HOME/{appName}    or  ~/.config/{appName}
 *
 * This is the same function that was previously called getAppDataPath()
 * in editors/base.js.  That name is kept as an alias for back-compat.
 */
function getConfigDir(appName) {
  switch (PLATFORM) {
    case 'darwin':
      return path.join(HOME, 'Library', 'Application Support', appName);
    case 'win32': {
      const appData = process.env.APPDATA || path.join(HOME, 'AppData', 'Roaming');
      return path.join(appData, appName);
    }
    default: { // linux + other POSIX
      const xdgConfig = process.env.XDG_CONFIG_HOME || path.join(HOME, '.config');
      return path.join(xdgConfig, appName);
    }
  }
}

/**
 * Data directory for apps that separate their data from their config
 * (e.g. OpenCode stores its SQLite DB in a data dir, not a config dir).
 *
 *   macOS:   ~/Library/Application Support/{appName}
 *   Windows: %LOCALAPPDATA%/{appName}       (Local – machine-local)
 *   Linux:   $XDG_DATA_HOME/{appName}       or  ~/.local/share/{appName}
 */
function getDataDir(appName) {
  switch (PLATFORM) {
    case 'darwin':
      return path.join(HOME, 'Library', 'Application Support', appName);
    case 'win32': {
      const localAppData = process.env.LOCALAPPDATA || path.join(HOME, 'AppData', 'Local');
      return path.join(localAppData, appName);
    }
    default: { // linux + other POSIX
      const xdgData = process.env.XDG_DATA_HOME || path.join(HOME, '.local', 'share');
      return path.join(xdgData, appName);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Project-path decoder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Decode a project directory name back to an absolute filesystem path.
 *
 * Claude Code, CommandCode, and Cursor Agent all encode the working-directory
 * path as the name of the project subdirectory by replacing the path separator
 * with "-".  The exact format varies slightly:
 *
 *   Unix (Claude Code):    /Users/fka/Code/foo  →  "-Users-fka-Code-foo"
 *                          (leading "/" becomes leading "-")
 *
 *   Unix (CommandCode /    /Users/fka/Code/foo  →  "Users-fka-Code-foo"
 *   Cursor Agent):         (no leading "-"; "/" is prepended on decode)
 *
 *   Windows (Claude Code): C:\Users\fka\Code\foo → "C--Users-fka-Code-foo"
 *                          (drive + ":" become "X--", "\" becomes "-")
 *
 * The function accepts an optional `platform` argument so it can be unit-tested
 * without mocking process.platform.
 *
 * @param {string}  dirName  - The encoded directory entry name
 * @param {string} [plat]    - Override for process.platform (for testing)
 * @returns {string}           Best-effort decoded absolute path
 */
function decodeProjectPath(dirName, plat) {
  if (!dirName) return dirName;
  const p = plat || PLATFORM;

  if (p === 'win32') {
    // Windows: "C--Users-fka-Code-foo"  →  "C:\Users\fka\Code\foo"
    const winDrive = dirName.match(/^([A-Za-z])--(.+)$/);
    if (winDrive) {
      const drive = winDrive[1].toUpperCase();
      const rest  = winDrive[2].replace(/-/g, '\\');
      return `${drive}:\\${rest}`;
    }
    // No drive letter detected – treat as relative path (best effort)
    return dirName.replace(/-/g, path.sep);
  }

  // Unix (macOS + Linux):
  //   "-Users-fka-Code-foo"  →  "/Users/fka/Code/foo"
  //   "Users-fka-Code-foo"   →  "/Users/fka/Code/foo"
  if (dirName.startsWith('-')) {
    return dirName.replace(/-/g, '/');
  }
  return '/' + dirName.replace(/-/g, '/');
}

// ─────────────────────────────────────────────────────────────────────────────
// Windsurf language-server binary name
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the Windsurf language-server binary name for the current platform,
 * as it appears in the process list.
 *
 *   macOS:   language_server_macos
 *   Linux:   language_server_linux
 *   Windows: language_server_windows.exe
 */
function windsurfServerBinary() {
  switch (PLATFORM) {
    case 'darwin':  return 'language_server_macos';
    case 'win32':   return 'language_server_windows.exe';
    default:        return 'language_server_linux';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────────────────────

module.exports = {
  HOME,
  PLATFORM,
  getConfigDir,
  getDataDir,
  decodeProjectPath,
  windsurfServerBinary,
};
