'use strict';

/**
 * Unit tests for editors/platform.js
 *
 * Run with:  npm test
 * Requires Node ≥ 18 (built-in test runner).
 *
 * All tests are deterministic and do not touch the filesystem.
 * Platform-dependent functions that accept a `plat` override are tested
 * for all three platforms regardless of where the tests are running.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');

// We import and re-test the individual exported functions.
const platform = require('../editors/platform');
const { getConfigDir, getDataDir, decodeProjectPath, windsurfServerBinary, HOME, PLATFORM } = platform;

// ─────────────────────────────────────────────────────────────────────────────
// decodeProjectPath
// ─────────────────────────────────────────────────────────────────────────────

describe('decodeProjectPath', () => {

  describe('macOS / Linux', () => {
    const plat = 'darwin';

    test('leading-dash convention (Claude Code style)', () => {
      assert.equal(decodeProjectPath('-Users-fka-Code-foo', plat), '/Users/fka/Code/foo');
    });

    test('no leading dash (CommandCode / Cursor-Agent style)', () => {
      assert.equal(decodeProjectPath('Users-fka-Code-foo', plat), '/Users/fka/Code/foo');
    });

    test('deep path without hyphens in dir names', () => {
      assert.equal(decodeProjectPath('-home-alice-projects-myapp', plat), '/home/alice/projects/myapp');
    });

    test('hyphens in dir names are a known ambiguity — decoded to /', () => {
      // The encoding replaces all separators with "-", so a literal "-" in a
      // folder name is indistinguishable from a path separator.  Callers that
      // need to resolve the true path (e.g. cursor-agent.js) apply a
      // filesystem-existence heuristic on top of this function.
      assert.equal(decodeProjectPath('-home-alice-my-project', plat), '/home/alice/my/project');
    });

    test('single segment', () => {
      assert.equal(decodeProjectPath('-tmp', plat), '/tmp');
    });

    test('empty string returns empty string', () => {
      assert.equal(decodeProjectPath('', plat), '');
    });

    test('null returns null', () => {
      assert.equal(decodeProjectPath(null, plat), null);
    });

    test('undefined returns undefined', () => {
      assert.equal(decodeProjectPath(undefined, plat), undefined);
    });

    test('linux platform behaves the same as darwin', () => {
      assert.equal(decodeProjectPath('-home-user-dev', 'linux'), '/home/user/dev');
    });
  });

  describe('Windows', () => {
    const plat = 'win32';

    test('drive-letter convention "C--Users-fka-Code-foo"', () => {
      assert.equal(decodeProjectPath('C--Users-fka-Code-foo', plat), 'C:\\Users\\fka\\Code\\foo');
    });

    test('lowercase drive letter is uppercased', () => {
      assert.equal(decodeProjectPath('c--Users-fka-Code-foo', plat), 'C:\\Users\\fka\\Code\\foo');
    });

    test('D drive', () => {
      assert.equal(decodeProjectPath('D--work-project', plat), 'D:\\work\\project');
    });

    test('no drive letter falls back to separator replacement', () => {
      // Relative-ish Windows path (e.g. from a tool that omits the drive)
      const result = decodeProjectPath('Users-fka-Code-foo', plat);
      // On win32, path.sep is '\\' — tested here indirectly via the fallback branch
      assert.ok(result.includes('Users'), 'result should contain path segment');
    });

    test('empty string returns empty string', () => {
      assert.equal(decodeProjectPath('', plat), '');
    });
  });

});

// ─────────────────────────────────────────────────────────────────────────────
// getConfigDir
// ─────────────────────────────────────────────────────────────────────────────

describe('getConfigDir', () => {
  const home = os.homedir();

  test('macOS returns ~/Library/Application Support/{name}', () => {
    // We call the real function but stub the platform internally by checking
    // the live result matches the expected path for the running platform.
    if (PLATFORM === 'darwin') {
      assert.equal(getConfigDir('TestApp'), path.join(home, 'Library', 'Application Support', 'TestApp'));
    }
  });

  test('contains the appName in the result', () => {
    const result = getConfigDir('MyEditor');
    assert.ok(result.includes('MyEditor'), `Expected "MyEditor" in "${result}"`);
  });

  test('result is an absolute path', () => {
    const result = getConfigDir('SomeApp');
    assert.ok(path.isAbsolute(result), `Expected absolute path, got "${result}"`);
  });

  test('VS Code variant — Code', () => {
    const result = getConfigDir('Code');
    assert.ok(result.includes('Code'), `Expected "Code" in "${result}"`);
  });

  test('VS Code Insiders variant', () => {
    const result = getConfigDir('Code - Insiders');
    assert.ok(result.includes('Code - Insiders'), `Expected "Code - Insiders" in "${result}"`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getDataDir
// ─────────────────────────────────────────────────────────────────────────────

describe('getDataDir', () => {
  const home = os.homedir();

  test('macOS returns ~/Library/Application Support/{name}', () => {
    if (PLATFORM === 'darwin') {
      assert.equal(getDataDir('opencode'), path.join(home, 'Library', 'Application Support', 'opencode'));
    }
  });

  test('Linux returns XDG_DATA_HOME or ~/.local/share', () => {
    if (PLATFORM === 'linux') {
      const xdg = process.env.XDG_DATA_HOME || path.join(home, '.local', 'share');
      assert.equal(getDataDir('opencode'), path.join(xdg, 'opencode'));
    }
  });

  test('result contains appName', () => {
    const result = getDataDir('opencode');
    assert.ok(result.includes('opencode'), `Expected "opencode" in "${result}"`);
  });

  test('result is an absolute path', () => {
    assert.ok(path.isAbsolute(getDataDir('opencode')));
  });

  test('getConfigDir and getDataDir return different paths on Linux', () => {
    if (PLATFORM === 'linux') {
      assert.notEqual(getConfigDir('App'), getDataDir('App'));
    }
  });

  test('getConfigDir and getDataDir return same path on macOS', () => {
    if (PLATFORM === 'darwin') {
      assert.equal(getConfigDir('App'), getDataDir('App'));
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// windsurfServerBinary
// ─────────────────────────────────────────────────────────────────────────────

describe('windsurfServerBinary', () => {
  test('returns a non-empty string', () => {
    assert.ok(windsurfServerBinary().length > 0);
  });

  test('returns platform-appropriate binary name', () => {
    const bin = windsurfServerBinary();
    if (PLATFORM === 'darwin')  assert.equal(bin, 'language_server_macos');
    if (PLATFORM === 'linux')   assert.equal(bin, 'language_server_linux');
    if (PLATFORM === 'win32')   assert.equal(bin, 'language_server_windows.exe');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HOME and PLATFORM exports
// ─────────────────────────────────────────────────────────────────────────────

describe('module exports', () => {
  test('HOME equals os.homedir()', () => {
    assert.equal(HOME, os.homedir());
  });

  test('PLATFORM equals process.platform', () => {
    assert.equal(PLATFORM, process.platform);
  });
});
