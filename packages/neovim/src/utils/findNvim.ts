import { execFileSync } from 'node:child_process';
import { join, delimiter, normalize } from 'node:path';
import { existsSync } from 'node:fs';

export type NvimVersion = {
  /** Command that runs Nvim, e.g. `['wsl.exe', '-d', 'Ubuntu', 'nvim']`. Append args to it. */
  readonly cmd: string[];
  /** @deprecated Use `cmd`. Same as `cmd[0]`. */
  readonly path: string;
  /** Nvim version, or undefined if there was an error. */
  readonly nvimVersion?: string;
  /** Nvim build type, or undefined if there was an error. */
  readonly buildType?: string;
  /** Nvim LuaJIT version, or undefined if there was an error. */
  readonly luaJitVersion?: string;
  /** Error caught while attempting to access or run Nvim at the given path. */
  readonly error?: Readonly<Error>;
};

export type FindNvimOptions = {
  /**
   * (Optional) Minimum `nvim` version (inclusive) to search for.
   *
   * - Example: `'0.5.0'`
   */
  readonly minVersion?: string;
  /**
   * (Optional) Sort order of list of `nvim` versions.
   *
   * - "desc" - (Default) Sort by version in descending order (highest to lowest).
   *   - Example: `['0.5.0', '0.4.4', '0.4.3']`
   * - "none" - Order is that of the searched `$PATH` components.
   *   - Example: `['0.4.4', '0.5.0', '0.4.3']`
   */
  readonly orderBy?: 'desc' | 'none';
  /**
   * (Optional) Stop searching after found a valid match
   */
  readonly firstMatch?: boolean;
  /**
   * (Optional) Other commands that (potentially) invoke Nvim.  Not allowed with `dirs`; skips
   * searching the default locations. Useful for checking a user-configured Nvim location or
   * arbitrary wrappers such as Windows WSL.
   *
   * Example:
   * ```
   * cmds: [
   *   ['/opt/homebrew/bin/nvim'],
   *   ['C:/Windows/system32/wsl.exe', '-d', 'Ubuntu', 'nvim'],
   * ],
   * ```
   */
  readonly cmds?: string[][];
  /** @deprecated */
  readonly paths?: string[];
  /**
   * (Optional) Additional directories to search for Nvim executables, before `$PATH` and other
   * default locations. Not allowed with `cmds`.
   *
   * Example: ['/opt/neovim/bin', '/home/user/custom/bin']
   */
  readonly dirs?: string[];
};

export type FindNvimResult = {
  /**
   * List of satisfying `nvim` versions found (if any) on the current system, sorted in the order
   * specified by `orderBy`.
   */
  readonly matches: ReadonlyArray<NvimVersion>;
  /**
   * List of invalid or failed `nvim` versions found (if any), in order of searched `$PATH` components.
   */
  readonly invalid: ReadonlyArray<NvimVersion>;
};

const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/;
const nvimVersionRegex = /^[nN][vV][iI][mM]\s+v?(.+)$/m;
const buildTypeRegex = /^Build\s+type:\s+(.+)$/m;
const luaJitVersionRegex = /^LuaJIT\s+(.+)$/m;
const windows = process.platform === 'win32';

function parseVersion(version: string): (number | string)[] | undefined {
  if (typeof version !== 'string') {
    throw new TypeError('Invalid version format: not a string');
  }

  const match = version.match(versionRegex);
  if (!match) {
    return undefined;
  }

  const [, major, minor, patch, prerelease] = match;
  if (major === undefined || minor === undefined || patch === undefined) {
    throw new TypeError(`Invalid version string: "${version}"`);
  }
  const majorNumber = Number(major);
  const minorNumber = Number(minor);
  const patchNumber = Number(patch);

  const versionParts: Array<number | string> = [majorNumber, minorNumber, patchNumber];
  if (prerelease !== undefined) {
    versionParts.push(prerelease);
  } else {
    versionParts.push('zzz');
  }
  return versionParts;
}

/**
 * Compares two versions.
 * @param a - First version to compare.
 * @param b - Second version to compare.
 * @returns -1 if a < b, 0 if a == b, 1 if a > b.
 * @throws {TypeError} If the versions are not valid.
 *
 * Format could be:
 * - 0.9.1
 * - 0.10.0-dev-658+g06694203e-Homebrew
 */
function compareVersions(a: string, b: string): number {
  const versionA = parseVersion(a);
  const versionB = parseVersion(b);
  if (versionA === undefined) {
    throw new TypeError(`Invalid version: "${a}"`);
  }
  if (versionB === undefined) {
    return 1;
  }

  const length = Math.min(versionA.length, versionB.length);
  for (let i = 0; i < length; i = i + 1) {
    const partA = versionA[i] ?? 0;
    const partB = versionB[i] ?? 0;
    if (partA < partB) {
      return -1;
    }
    if (partA > partB) {
      return 1;
    }
  }

  if (versionB.length > versionA.length) {
    return -1;
  }

  return 0;
}

function normalizePath(path: string): string {
  return normalize(windows ? path.toLowerCase() : path);
}

function getPlatformSearchDirs(): Set<string> {
  const dirs = new Set<string>();
  const { PATH, USERPROFILE, LOCALAPPDATA, PROGRAMFILES, HOME } = process.env;

  PATH?.split(delimiter).forEach(p => dirs.add(normalizePath(p)));

  // Add common Nvim locations which may not be in the system $PATH.
  if (windows) {
    // Scoop install location.
    if (USERPROFILE) {
      dirs.add(normalizePath(`${USERPROFILE}/scoop/shims`));
    }
    dirs.add(normalizePath('C:/ProgramData/scoop/shims'));

    // Winget install location. https://github.com/microsoft/winget-cli/blob/master/doc/specs/%23182%20-%20Support%20for%20installation%20of%20portable%20standalone%20apps.md
    if (LOCALAPPDATA) {
      dirs.add(normalizePath(`${LOCALAPPDATA}/Microsoft/WindowsApps`));
      dirs.add(normalizePath(`${LOCALAPPDATA}/Microsoft/WinGet/Packages`));
    }
    if (PROGRAMFILES) {
      dirs.add(normalizePath(`${PROGRAMFILES}/Neovim/bin`));
      dirs.add(normalizePath(`${PROGRAMFILES} (x86)/Neovim/bin`));
      dirs.add(normalizePath(`${PROGRAMFILES}/WinGet/Packages`));
      dirs.add(normalizePath(`${PROGRAMFILES} (x86)/WinGet/Packages`));
    }
  } else {
    // Common locations for Unix-like systems.
    [
      '/usr/local/bin',
      '/usr/bin',
      '/opt/homebrew/bin',
      '/home/linuxbrew/.linuxbrew/bin',
      '/snap/nvim/current/usr/bin',
    ].forEach(p => dirs.add(p));

    if (HOME) {
      dirs.add(normalizePath(`${HOME}/bin`));
      dirs.add(normalizePath(`${HOME}/.linuxbrew/bin`));
    }
  }

  return dirs;
}

/**
 * Tries to find a usable `nvim` binary on the current system. Searches common locations by default.
 *
 * @param opt.minVersion See {@link FindNvimOptions.minVersion}
 * @param opt.orderBy See {@link FindNvimOptions.orderBy}
 * @param opt.firstMatch See {@link FindNvimOptions.firstMatch}
 * @param opt.cmds See {@link FindNvimOptions.cmds}
 * @param opt.dirs See {@link FindNvimOptions.dirs}
 * @throws {TypeError} If `cmds` and `dirs` are both given.
 */
export function findNvim(opt: FindNvimOptions = {}): Readonly<FindNvimResult> {
  if (opt.cmds?.length && opt.dirs?.length) {
    throw new TypeError('Invalid params: cannot combine `cmds` and `dirs`');
  }
  const nvimExecutable = windows ? 'nvim.exe' : 'nvim';
  const userCmds = [...(opt.cmds ?? []), ...(opt.paths ?? []).map(p => [p])].map(
    ([arg0, ...args]) => [normalizePath(arg0), ...args]
  );
  const searchDirs = opt.cmds?.length ? [] : [...(opt.dirs ?? []), ...getPlatformSearchDirs()];
  // Unlike `cmds` (always tried, so failures are reported in `invalid`), skip dirs without Nvim.
  const dirCmds = searchDirs
    .map(dir => [normalizePath(join(dir, nvimExecutable))])
    .filter(([nvimPath]) => existsSync(nvimPath));
  // Dedupe, e.g. if a dir is in both $PATH and the platform defaults.
  const allCmds = new Map(
    [...userCmds, ...dirCmds].map(cmd => [JSON.stringify(cmd), cmd] as const)
  );

  const matches = new Array<NvimVersion>();
  const invalid = new Array<NvimVersion>();
  for (const cmd of allCmds.values()) {
    const [arg0, ...args] = cmd;
    try {
      // TODO: fallback to `echo 'print(vim.version())' | nvim -l -` if parsing --version fails.
      const nvimVersionFull = execFileSync(arg0, [...args, '--version']).toString();
      const nvimVersionMatch = nvimVersionRegex.exec(nvimVersionFull);
      const buildTypeMatch = buildTypeRegex.exec(nvimVersionFull);
      const luaJitVersionMatch = luaJitVersionRegex.exec(nvimVersionFull);
      if (!nvimVersionMatch || !buildTypeMatch || !luaJitVersionMatch) {
        continue;
      }
      const found: NvimVersion = {
        cmd,
        path: arg0,
        nvimVersion: nvimVersionMatch[1],
        buildType: buildTypeMatch[1],
        luaJitVersion: luaJitVersionMatch[1],
      };
      if (
        'minVersion' in opt &&
        compareVersions(opt.minVersion ?? '0.0.0', nvimVersionMatch[1]) === 1
      ) {
        invalid.push(found);
      } else {
        matches.push(found);
        if (opt.firstMatch) {
          break;
        }
      }
    } catch (e) {
      invalid.push({ cmd, path: arg0, error: e as Error });
    }
  }

  if (opt.orderBy === undefined || opt.orderBy === 'desc') {
    matches.sort((a, b) => compareVersions(b.nvimVersion ?? '0.0.0', a.nvimVersion ?? '0.0.0'));
  }

  return {
    matches,
    invalid,
  } as const;
}

// eslint-disable-next-line import/no-mutable-exports
export let exportsForTesting: any;
// .mocharc.js sets NODE_ENV=test.
if (process.env.NODE_ENV === 'test') {
  // These functions are intentionally not exported. After `nvim` is found, clients can use Nvim's
  // own `vim.version` module, so node-client shouldn't expose a half-baked "semver" implementation.
  exportsForTesting = {
    parseVersion,
    compareVersions,
    normalizePath,
  };
}
