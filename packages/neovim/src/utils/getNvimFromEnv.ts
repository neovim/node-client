import { execSync } from 'child_process';
import { join, delimiter } from 'path';
import { existsSync } from 'fs';

export interface NvimVersion {
  nvimVersion: string;
  path: string;
  buildType: string;
  luaJitVersion: string;
}

const versionRegex = /^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/;
const nvimVersionRegex = /^NVIM\s+v(.+)$/m;
const buildTypeRegex = /^Build\s+type:\s+(.+)$/m;
const luaJitVersionRegex = /^LuaJIT\s+(.+)$/m;
const windows = process.platform === 'win32';

function parseVersion(version: string): (number | string)[] | null {
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
export function getNvimFromEnv(minVersion?: string): NvimVersion | null {
  const paths = process.env.PATH.split(delimiter);
  const pathLength = paths.length;
  let highestMatchingVersion: NvimVersion | null = null;
  for (let i = 0; i !== pathLength; i = i + 1) {
    const possibleNvimPath = join(paths[i], windows ? 'nvim.exe' : 'nvim');
    if (existsSync(possibleNvimPath)) {
      const nvimVersionFull = execSync(
        `${possibleNvimPath} --version`
      ).toString();
      const nvimVersionMatch = nvimVersionRegex.exec(nvimVersionFull);
      const buildTypeMatch = buildTypeRegex.exec(nvimVersionFull);
      const luaJitVersionMatch = luaJitVersionRegex.exec(nvimVersionFull);
      if (
        // if all the regexes matched
        nvimVersionMatch &&
        buildTypeMatch &&
        luaJitVersionMatch &&
        // and the version is greater than the minimum version or there is no minimum version
        (minVersion === undefined ||
          compareVersions(minVersion, nvimVersionMatch[1]) !== 1) &&
        // and the version is greater than the current highest version or there is no current highest version
        (highestMatchingVersion === null ||
          compareVersions(
            highestMatchingVersion.nvimVersion,
            nvimVersionMatch[1]
          ) === -1)
      ) {
        highestMatchingVersion = {
          nvimVersion: nvimVersionMatch[1],
          path: possibleNvimPath,
          buildType: buildTypeMatch[1],
          luaJitVersion: luaJitVersionMatch[1],
        };
      }
    }
  }
  return highestMatchingVersion;
}
