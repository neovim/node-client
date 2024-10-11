import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import expect from 'expect';
import { findNvim, exportsForTesting, FindNvimResult } from './findNvim';

const parseVersion = exportsForTesting.parseVersion;
const compareVersions = exportsForTesting.compareVersions;
const normalizePath = exportsForTesting.normalizePath as (p: string) => string;

describe('findNvim', () => {
  const testDir = join(process.cwd(), 'test-dir');
  const nvimExecutablePath = normalizePath(
    join(testDir, process.platform === 'win32' ? 'nvim.exe' : 'nvim')
  );

  before(() => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(nvimExecutablePath, 'fake-nvim-executable');
  });

  after(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('parseVersion()', () => {
    expect(parseVersion('0.5.0-dev+1357-g192f89ea1')).toEqual([
      0,
      5,
      0,
      'dev+1357-g192f89ea1',
    ]);
    expect(parseVersion('0.5.0-dev+1357-g192f89ea1-Homebrew')).toEqual([
      0,
      5,
      0,
      'dev+1357-g192f89ea1-Homebrew',
    ]);
    expect(parseVersion('0.9.1')).toEqual([0, 9, 1, 'zzz']);

    // Failure modes:
    expect(() => parseVersion(42 as any)).toThrow(TypeError);
    expect(parseVersion('x.y.z')).toEqual(undefined);
    expect(parseVersion('1.y.z')).toEqual(undefined);
    expect(parseVersion('1.2.z')).toEqual(undefined);
    expect(parseVersion('x.2.3')).toEqual(undefined);
    expect(parseVersion('1.y.3')).toEqual(undefined);
  });

  it('compareVersions()', () => {
    expect(compareVersions('0.3.0', '0.3.0')).toBe(0);
    expect(compareVersions('0.3.0', '0.3.1')).toBe(-1);
    expect(compareVersions('0.3.1', '0.3.0')).toBe(1);
    expect(compareVersions('0.3.0-abc', '0.3.0-dev-420')).toBe(-1);
    expect(compareVersions('0.3.0', '0.3.0-dev-658+g06694203e-Homebrew')).toBe(
      1
    );
    expect(compareVersions('0.3.0-dev-658+g06694203e-Homebrew', '0.3.0')).toBe(
      -1
    );
    expect(
      compareVersions(
        '0.3.0-dev-658+g06694203e-Homebrew',
        '0.3.0-dev-658+g06694203e-Homebrew'
      )
    ).toBe(0);
    expect(
      compareVersions(
        '0.3.0-dev-658+g06694203e-Homebrew',
        '0.3.0-dev-659+g06694203e-Homebrew'
      )
    ).toBe(-1);
    expect(
      compareVersions(
        '0.3.0-dev-659+g06694203e-Homebrew',
        '0.3.0-dev-658+g06694203e-Homebrew'
      )
    ).toBe(1);

    // Failure modes:
    expect(compareVersions('0.3.0', 'nonsense')).toBe(1);
    expect(() => compareVersions('nonsense', '0.3.0')).toThrow(
      'Invalid version: "nonsense"'
    );
    expect(() => compareVersions('nonsense', 'nonsense')).toThrow(
      'Invalid version: "nonsense"'
    );
    expect(() => compareVersions(undefined, undefined)).toThrow(
      'Invalid version format: not a string'
    );
  });

  /** Asserts that >=1 nvim binaries were found. */
  function assertOneOrMore(nvimRes: Readonly<FindNvimResult>) {
    expect(nvimRes).toEqual({
      matches: expect.any(Array),
      invalid: expect.any(Array),
    });
    expect(nvimRes.matches.length).toBeGreaterThan(0);
    expect(nvimRes.matches[0]).toEqual({
      nvimVersion: expect.any(String),
      path: expect.any(String),
      buildType: expect.any(String),
      luaJitVersion: expect.any(String),
      error: undefined,
    });
    expect(nvimRes.invalid.length).toEqual(0);
  }

  it('gets Nvim satisfying given min version', () => {
    const nvimRes = findNvim({ minVersion: '0.3.0', orderBy: 'desc' });
    assertOneOrMore(nvimRes);
  });

  it('gets Nvim without specified min version', () => {
    const nvimRes = findNvim();
    assertOneOrMore(nvimRes);
  });

  it('collects invalid matches separately', () => {
    const nvimRes = findNvim({ minVersion: '9999.0.0' });
    expect(nvimRes).toEqual({
      matches: [],
      invalid: expect.any(Array),
    });
    expect(nvimRes.matches.length).toEqual(0);
    expect(nvimRes.invalid.length).toBeGreaterThan(0);
    expect(nvimRes.invalid[0]).toEqual({
      nvimVersion: expect.any(String),
      path: expect.any(String),
      buildType: expect.any(String),
      luaJitVersion: expect.any(String),
      error: undefined,
    });
  });

  it('stops searching on first match when firstMatch is True', () => {
    const nvimRes = findNvim({ minVersion: '0.3.0', firstMatch: true });
    expect(nvimRes).toEqual({
      matches: expect.any(Array),
      invalid: expect.any(Array),
    });
    expect(nvimRes.matches.length).toEqual(1);
    expect(nvimRes.matches[0]).toEqual({
      nvimVersion: expect.any(String),
      path: expect.any(String),
      buildType: expect.any(String),
      luaJitVersion: expect.any(String),
      error: undefined,
    });
  });

  it('searches in additional custom paths', () => {
    const customPaths = [
      join(process.cwd(), 'package.json'),
      '/custom/path/to/nvim',
      '/another/custom/path',
    ].map(normalizePath);
    const nvimRes = findNvim({ paths: customPaths });

    expect(nvimRes.matches.length).toBeGreaterThanOrEqual(1);

    expect(nvimRes.invalid.length).toBe(3);

    const invalidPaths = nvimRes.invalid.map(i => i.path);
    expect(invalidPaths).toEqual(customPaths);
  });

  it('searches in additional custom dirs', () => {
    const customDirs = [testDir, '/non/existent/dir'].map(normalizePath);
    const nvimRes = findNvim({ dirs: customDirs });

    expect(nvimRes.matches.length).toBeGreaterThanOrEqual(1);

    expect(nvimRes.invalid.length).toBe(1);
    expect(nvimRes.invalid[0].path).toBe(nvimExecutablePath);
  });
});
