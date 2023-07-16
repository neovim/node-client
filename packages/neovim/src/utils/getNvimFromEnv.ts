import { execSync } from 'child_process';
import { join, delimiter } from 'path';
import { constants, existsSync, accessSync } from 'fs';

export type NvimVersion = {
  readonly nvimVersion: string;
  readonly path: string;
  readonly buildType: string;
  readonly luaJitVersion: string;
};

export type GetNvimFromEnvOptions = {
  /**
   * The minimum version of nvim to get. This is optional.
   *
   * - Example: `'0.5.0'`
   * - Note: This is inclusive.
   * - Note: If this is not set, then there is no minimum version.
   */
  readonly minVersion?: string;
  /**
   * The order to return the nvim versions in. This is optional.
   *
   * - `latest_nvim_first` - The latest version of nvim will be first. This is the default.
   *   - Example: `['0.5.0', '0.4.4', '0.4.3']`
   *   - Note: This will be slower than `latest_nvim_first`.
   * - `keep_path` - The order of the nvim versions will be the same as the order of the paths in the `PATH` environment variable.
   *   - Example: `['0.4.4', '0.5.0', '0.4.3']`
   *   - Note: This will be faster than `latest_nvim_first`.
   *   - this is the default.
   */
  readonly orderBy?: 'latest_nvim_first' | 'keep_path';
};

export type GetNvimFromEnvError = {
  /** The executeable path that failed. */
  readonly path: string;
  /** The catched error */
  readonly exception: Readonly<Error>;
};

export type GetNvimFromEnvResult = {
  /**
   * A list of nvim versions that match the minimum version.
   * This will be empty if no matching versions were found.
   * This will be sorted in the order specified by `orderBy`.
   */
  readonly matches: ReadonlyArray<NvimVersion>;
  /**
   * A list of nvim versions that do not match the minimum version.
   * This will be empty if all versions match the minimum version or if no minimum version was specified.
   * This will not be sorted (it will be in the order of the paths in the `PATH` environment variable).
   */
  readonly unmatchedVersions: ReadonlyArray<NvimVersion>;
  /**
   * A list of errors that occurred while trying to get the nvim versions.
   * This will be empty if no errors occurred.
   * This will not be sorted (it will be in the order of the paths in the `PATH` environment variable).
   * Unmatched versions are not treated as errors.
   */
  readonly errors: ReadonlyArray<GetNvimFromEnvError>;
};

const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/;
const nvimVersionRegex = /^NVIM\s+v(.+)$/m;
const buildTypeRegex = /^Build\s+type:\s+(.+)$/m;
const luaJitVersionRegex = /^LuaJIT\s+(.+)$/m;
const windows = process.platform === 'win32';

function parseVersion(version: string): (number | string)[] | null {
  if (typeof version !== 'string') {
    throw new Error('Invalid version format: not a string');
  }

  const match = version.match(versionRegex);
  if (match === null) {
    return null;
  }

  const [, major, minor, patch, prerelease] = match;
  const majorNumber = Number(major);
  if (Number.isNaN(majorNumber)) {
    throw new Error('Invalid version format: major is not a number');
  }

  const minorNumber = Number(minor);
  if (Number.isNaN(minorNumber)) {
    throw new Error('Invalid version format: minor is not a number');
  }

  const patchNumber = Number(patch);
  if (Number.isNaN(patchNumber)) {
    throw new Error('Invalid version format: patch is not a number');
  }

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
 * Compare two versions.
 * @param a - The first version to compare.
 * @param b - The second version to compare.
 * @returns -1 if a < b, 0 if a == b, 1 if a > b.
 * @throws {Error} If the versions are not valid.
 *
 * Format could be:
 * - 0.9.1
 * - 0.10.0-dev-658+g06694203e-Homebrew
 */
export function compareVersions(a: string, b: string): number {
  const versionA = parseVersion(a);
  const versionB = parseVersion(b);
  const length = Math.min(versionA.length, versionB.length);

  for (let i = 0; i < length; i = i + 1) {
    const partA = versionA[i];
    const partB = versionB[i];
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

/**
 * Get the highest matching nvim version from the environment.
 */
export function getNvimFromEnv(
  opt: GetNvimFromEnvOptions = {}
): Readonly<GetNvimFromEnvResult> {
  const paths = process.env.PATH.split(delimiter);
  const pathLength = paths.length;
  const matches = new Array<NvimVersion>();
  const unmatchedVersions = new Array<NvimVersion>();
  const errors = new Array<GetNvimFromEnvError>();
  for (let i = 0; i !== pathLength; i = i + 1) {
    const possibleNvimPath = join(paths[i], windows ? 'nvim.exe' : 'nvim');
    if (existsSync(possibleNvimPath)) {
      try {
        accessSync(possibleNvimPath, constants.X_OK);
        const nvimVersionFull = execSync(
          `${possibleNvimPath} --version`
        ).toString();
        const nvimVersionMatch = nvimVersionRegex.exec(nvimVersionFull);
        const buildTypeMatch = buildTypeRegex.exec(nvimVersionFull);
        const luaJitVersionMatch = luaJitVersionRegex.exec(nvimVersionFull);
        if (nvimVersionMatch && buildTypeMatch && luaJitVersionMatch) {
          if (
            'minVersion' in opt &&
            compareVersions(opt.minVersion, nvimVersionMatch[1]) === 1
          ) {
            unmatchedVersions.push({
              nvimVersion: nvimVersionMatch[1],
              path: possibleNvimPath,
              buildType: buildTypeMatch[1],
              luaJitVersion: luaJitVersionMatch[1],
            });
          }
          matches.push({
            nvimVersion: nvimVersionMatch[1],
            path: possibleNvimPath,
            buildType: buildTypeMatch[1],
            luaJitVersion: luaJitVersionMatch[1],
          });
        }
      } catch (e) {
        errors.push({
          path: possibleNvimPath,
          exception: e,
        } as const);
      }
    }
  }

  if (matches.length > 1 && opt.orderBy === 'latest_nvim_first') {
    matches.sort((a, b) => compareVersions(b.nvimVersion, a.nvimVersion));
  }

  return {
    matches,
    unmatchedVersions,
    errors,
  } as const;
}
