import { execFileSync } from 'node:child_process';
import { join, delimiter } from 'node:path';
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
  readonly stopOnFirstMatch?: boolean;
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
const nvimVersionRegex = /^NVIM\s+v(.+)$/m;
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
  const length = Math.min(versionA?.length ?? 0, versionB?.length ?? 0);

  for (let i = 0; i < length; i = i + 1) {
    const partA = versionA?.[i] ?? 0;
    const partB = versionB?.[i] ?? 0;
    if (partA < partB) {
      return -1;
    }
    if (partA > partB) {
      return 1;
    }
  }

  if ((versionB?.length ?? 0) > (versionA?.length ?? 0)) {
    return -1;
  }

  return 0;
}

/**
 * Tries to find a usable `nvim` binary on the current system.
 *
 * @param opt.minVersion See {@link FindNvimOptions.minVersion}
 * @param opt.orderBy See {@link FindNvimOptions.orderBy}
 * @param opt.stopOnFirstMatch See {@link FindNvimOptions.stopOnFirstMatch}
 */
export function findNvim({
  minVersion,
  orderBy,
  stopOnFirstMatch,
}: FindNvimOptions = {}): Readonly<FindNvimResult> {
  const paths = process.env.PATH?.split(delimiter) ?? [];
  paths.push(
    '/usr/local/bin',
    '/usr/bin',
    '/opt/homebrew/bin',
    '/home/linuxbrew/.linuxbrew/bin',
    '/snap/nvim/current/usr/bin'
  );
  const home = process.env.HOME;
  if (home) {
    paths.push(`${home}/bin`, `${home}/.linuxbrew/bin`);
  }

  const matches = new Array<NvimVersion>();
  const invalid = new Array<NvimVersion>();
  const uniquePaths = new Set(paths);
  for (const path of uniquePaths) {
    const nvimPath = join(path, windows ? 'nvim.exe' : 'nvim');
    if (existsSync(nvimPath)) {
      try {
        accessSync(nvimPath, constants.X_OK);
        const nvimVersionFull = execFileSync(nvimPath, [
          '--version',
        ]).toString();
        const nvimVersionMatch = nvimVersionRegex.exec(nvimVersionFull);
        const buildTypeMatch = buildTypeRegex.exec(nvimVersionFull);
        const luaJitVersionMatch = luaJitVersionRegex.exec(nvimVersionFull);
        if (nvimVersionMatch && buildTypeMatch && luaJitVersionMatch) {
          if (
            minVersion &&
            compareVersions(minVersion, nvimVersionMatch[1]) === 1
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

            if (stopOnFirstMatch) {
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

  if (orderBy === undefined || orderBy === 'desc') {
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
// jest sets NODE_ENV=test.
if (process.env.NODE_ENV === 'test') {
  // These functions are intentionally not exported. After `nvim` is found, clients can use Nvim's
  // own `vim.version` module, so node-client shouldn't expose a half-baked "semver" implementation.
  exportsForTesting = {
    parseVersion,
    compareVersions,
  };
}
