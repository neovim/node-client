import { execFileSync } from 'node:child_process';
import { join, delimiter, normalize } from 'node:path';
import { constants, existsSync, accessSync } from 'node:fs';

export type NvimVersion = {
  /** Path to `nvim` executable. */
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
   * (Optional) Additional specific file paths to check for Nvim executables.
   * These paths will be checked before searching `dirs`.
   * Useful for allowing users to specify exact Nvim executable locations.
   *
   * Example: ['/usr/local/bin/nvim', '/opt/homebrew/bin/nvim']
   */
  readonly paths?: string[];
  /**
   * (Optional) Additional directories to search for Nvim executables.
   * These directories will be searched after checking `paths`
   * but before searching `$PATH` and other default locations.
   * Useful for including non-standard installation directories.
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

  const versionParts: Array<number | string> = [
    majorNumber,
    minorNumber,
    patchNumber,
  ];
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
  const paths = new Set<string>();
  const { PATH, USERPROFILE, LOCALAPPDATA, PROGRAMFILES, HOME } = process.env;

  PATH?.split(delimiter).forEach(p => paths.add(normalizePath(p)));

  // Add common Neovim installation paths not always in the system's PATH.
  if (windows) {
    // Scoop common install location
    if (USERPROFILE) {
      paths.add(normalizePath(`${USERPROFILE}/scoop/shims`));
    }
    paths.add(normalizePath('C:/ProgramData/scoop/shims'));

    // Winget common install location
    // See https://github.com/microsoft/winget-cli/blob/master/doc/specs/%23182%20-%20Support%20for%20installation%20of%20portable%20standalone%20apps.md
    if (LOCALAPPDATA) {
      paths.add(normalizePath(`${LOCALAPPDATA}/Microsoft/WindowsApps`));
      paths.add(normalizePath(`${LOCALAPPDATA}/Microsoft/WinGet/Packages`));
    }
    if (PROGRAMFILES) {
      paths.add(normalizePath(`${PROGRAMFILES}/Neovim/bin`));
      paths.add(normalizePath(`${PROGRAMFILES} (x86)/Neovim/bin`));
      paths.add(normalizePath(`${PROGRAMFILES}/WinGet/Packages`));
      paths.add(normalizePath(`${PROGRAMFILES} (x86)/WinGet/Packages`));
    }
  } else {
    // Common paths for Unix-like systems
    [
      '/usr/local/bin',
      '/usr/bin',
      '/opt/homebrew/bin',
      '/home/linuxbrew/.linuxbrew/bin',
      '/snap/nvim/current/usr/bin',
    ].forEach(p => paths.add(p));

    if (HOME) {
      paths.add(normalizePath(`${HOME}/bin`));
      paths.add(normalizePath(`${HOME}/.linuxbrew/bin`));
    }
  }

  return paths;
}

/**
 * Tries to find a usable `nvim` binary on the current system.
 *
 * @param opt.minVersion See {@link FindNvimOptions.minVersion}
 * @param opt.orderBy See {@link FindNvimOptions.orderBy}
 * @param opt.firstMatch See {@link FindNvimOptions.firstMatch}
 * @param opt.paths See {@link FindNvimOptions.paths}
 * @param opt.dirs See {@link FindNvimOptions.dirs}
 */
export function findNvim(opt: FindNvimOptions = {}): Readonly<FindNvimResult> {
  const platformDirs = getPlatformSearchDirs();
  const nvimExecutable = windows ? 'nvim.exe' : 'nvim';
  const normalizedPathsFromUser = (opt.paths ?? []).map(normalizePath);

  const allPaths = new Set<string>([
    ...normalizedPathsFromUser,
    ...(opt.dirs ?? []).map(dir => normalizePath(join(dir, nvimExecutable))),
    ...[...platformDirs].map(dir => join(dir, nvimExecutable)),
  ]);

  const matches = new Array<NvimVersion>();
  const invalid = new Array<NvimVersion>();
  for (const nvimPath of allPaths) {
    if (existsSync(nvimPath) || normalizedPathsFromUser.includes(nvimPath)) {
      try {
        accessSync(nvimPath, constants.X_OK);
        // TODO: fallback to `echo 'print(vim.version())' | nvim -l -` if parsing --version fails.
        const nvimVersionFull = execFileSync(nvimPath, [
          '--version',
        ]).toString();
        const nvimVersionMatch = nvimVersionRegex.exec(nvimVersionFull);
        const buildTypeMatch = buildTypeRegex.exec(nvimVersionFull);
        const luaJitVersionMatch = luaJitVersionRegex.exec(nvimVersionFull);
        if (nvimVersionMatch && buildTypeMatch && luaJitVersionMatch) {
          if (
            'minVersion' in opt &&
            compareVersions(opt.minVersion ?? '0.0.0', nvimVersionMatch[1]) ===
              1
          ) {
            invalid.push({
              nvimVersion: nvimVersionMatch[1],
              path: nvimPath,
              buildType: buildTypeMatch[1],
              luaJitVersion: luaJitVersionMatch[1],
            });
          } else {
            matches.push({
              nvimVersion: nvimVersionMatch[1],
              path: nvimPath,
              buildType: buildTypeMatch[1],
              luaJitVersion: luaJitVersionMatch[1],
            });

            if (opt.firstMatch) {
              return {
                matches,
                invalid,
              } as const;
            }
          }
        }
      } catch (e) {
        invalid.push({
          path: nvimPath,
          error: e as Error,
        });
      }
    }
  }

  if (opt.orderBy === undefined || opt.orderBy === 'desc') {
    matches.sort((a, b) =>
      compareVersions(b.nvimVersion ?? '0.0.0', a.nvimVersion ?? '0.0.0')
    );
  }

  return {
    matches,
    invalid,
  } as const;
}

// eslint-disable-next-line import/no-mutable-exports
export let exportsForTesting: any;
// 'NODE_ENV=test' is being set in testSetup.ts
if (process.env.NODE_ENV === 'test') {
  // These functions are intentionally not exported. After `nvim` is found, clients can use Nvim's
  // own `vim.version` module, so node-client shouldn't expose a half-baked "semver" implementation.
  exportsForTesting = {
    parseVersion,
    compareVersions,
    normalizePath,
  };
}
