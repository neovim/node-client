import { execSync } from 'child_process';
import { join, delimiter } from 'path';
import { existsSync } from 'fs';

export interface NvimVersion {
  nvimVersion: string;
  path: string;
  buildType: string;
  luaJitVersion: string;
}

/**
 * Compare two versions.
 * @param {string} a - The first version to compare.
 * @param {string} b - The second version to compare.
 * @returns {number} -1 if a < b, 0 if a == b, 1 if a > b.
 * @throws {Error} If the versions are not valid.
 *
 * Format could be:
 * - 0.9.1
 * - 0.10.0-dev-658+g06694203e-Homebrew
 */
function compareVersions(a: string, b: string) {
  if (a === b) {
    return 0;
  }
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  throw new Error(`Invalid versions: ${a} ${b}`);
}

/**
 * Get the highest matching nvim version from the environment.
 */
export function getNvimFromEnv(minVersion?: string): NvimVersion | null {
  const paths = process.env.PATH.split(delimiter);
  const pathLength = paths.length;
  let highestMatchingVersion: NvimVersion | null = null;
  for (let i = 0; i !== pathLength; i = i + 1) {
    const possibleNvimPath = join(paths[i], 'nvim');
    if (existsSync(possibleNvimPath)) {
      const nvimVersionFull = execSync(
        `${possibleNvimPath} --version`
      ).toString();
      const nvimVersionMatch = /^NVIM\s+v(.+)$/m.exec(nvimVersionFull);
      const buildTypeMatch = /^Build\s+type:\s+(.+)$/m.exec(nvimVersionFull);
      const luaJitVersionMatch = /^LuaJIT\s+(.+)$/m.exec(nvimVersionFull);
      if (
        nvimVersionMatch &&
        buildTypeMatch &&
        luaJitVersionMatch &&
        compareVersions(nvimVersionMatch[1], minVersion) >= 0 &&
        (highestMatchingVersion == null ||
          compareVersions(
            nvimVersionMatch[1],
            highestMatchingVersion.nvimVersion
          ) > 0)
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
