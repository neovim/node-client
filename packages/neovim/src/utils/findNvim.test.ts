import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import assert from 'node:assert';
import * as sinon from 'sinon';
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
    assert.deepStrictEqual(parseVersion('0.5.0-dev+1357-g192f89ea1'), [
      0,
      5,
      0,
      'dev+1357-g192f89ea1',
    ]);
    assert.deepStrictEqual(parseVersion('0.5.0-dev+1357-g192f89ea1-Homebrew'), [
      0,
      5,
      0,
      'dev+1357-g192f89ea1-Homebrew',
    ]);
    assert.deepStrictEqual(parseVersion('0.9.1'), [0, 9, 1, 'zzz']);

    // Failure modes:
    assert.throws(() => parseVersion(42 as any), TypeError);
    assert.strictEqual(parseVersion('x.y.z'), undefined);
    assert.strictEqual(parseVersion('1.y.z'), undefined);
    assert.strictEqual(parseVersion('1.2.z'), undefined);
    assert.strictEqual(parseVersion('x.2.3'), undefined);
    assert.strictEqual(parseVersion('1.y.3'), undefined);
  });

  it('compareVersions()', () => {
    assert.strictEqual(compareVersions('0.3.0', '0.3.0'), 0);
    assert.strictEqual(compareVersions('0.3.0', '0.3.1'), -1);
    assert.strictEqual(compareVersions('0.3.1', '0.3.0'), 1);
    assert.strictEqual(compareVersions('0.3.0-abc', '0.3.0-dev-420'), -1);
    assert.strictEqual(
      compareVersions('0.3.0', '0.3.0-dev-658+g06694203e-Homebrew'),
      1
    );
    assert.strictEqual(
      compareVersions('0.3.0-dev-658+g06694203e-Homebrew', '0.3.0'),
      -1
    );
    assert.strictEqual(
      compareVersions(
        '0.3.0-dev-658+g06694203e-Homebrew',
        '0.3.0-dev-658+g06694203e-Homebrew'
      ),
      0
    );
    assert.strictEqual(
      compareVersions(
        '0.3.0-dev-658+g06694203e-Homebrew',
        '0.3.0-dev-659+g06694203e-Homebrew'
      ),
      -1
    );
    assert.strictEqual(
      compareVersions(
        '0.3.0-dev-659+g06694203e-Homebrew',
        '0.3.0-dev-658+g06694203e-Homebrew'
      ),
      1
    );

    // Failure modes:
    assert.strictEqual(compareVersions('0.3.0', 'nonsense'), 1);
    assert.throws(
      () => compareVersions('nonsense', '0.3.0'),
      TypeError('Invalid version: "nonsense"')
    );
    assert.throws(
      () => compareVersions('nonsense', 'nonsense'),
      TypeError('Invalid version: "nonsense"')
    );
    assert.throws(
      () => compareVersions(undefined, undefined),
      TypeError('Invalid version format: not a string')
    );
  });

  /** Asserts that >=1 nvim binaries were found. */
  function assertOneOrMore(nvimRes: Readonly<FindNvimResult>) {
    sinon.assert.match(nvimRes, {
      matches: sinon.match.array,
      invalid: sinon.match.array,
    });
    assert(nvimRes.matches.length > 0);
    sinon.assert.match(nvimRes.matches[0], {
      nvimVersion: sinon.match.string,
      path: sinon.match.string,
      buildType: sinon.match.string,
      luaJitVersion: sinon.match.string,
      error: undefined,
    });
    assert.strictEqual(nvimRes.invalid.length, 0);
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
    sinon.assert.match(nvimRes, {
      matches: [],
      invalid: sinon.match.array,
    });
    assert.strictEqual(nvimRes.matches.length, 0);
    assert(nvimRes.invalid.length > 0);
    sinon.assert.match(nvimRes.invalid[0], {
      nvimVersion: sinon.match.string,
      path: sinon.match.string,
      buildType: sinon.match.string,
      luaJitVersion: sinon.match.string,
      error: undefined,
    });
  });

  it('stops searching on first match when firstMatch is True', () => {
    const nvimRes = findNvim({ minVersion: '0.3.0', firstMatch: true });
    sinon.assert.match(nvimRes, {
      matches: sinon.match.array,
      invalid: sinon.match.array,
    });
    assert.strictEqual(nvimRes.matches.length, 1);
    sinon.assert.match(nvimRes.matches[0], {
      nvimVersion: sinon.match.string,
      path: sinon.match.string,
      buildType: sinon.match.string,
      luaJitVersion: sinon.match.string,
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

    assert(nvimRes.matches.length >= 1);
    assert.strictEqual(nvimRes.invalid.length, 3);

    const invalidPaths = nvimRes.invalid.map(i => i.path);
    assert.deepStrictEqual(invalidPaths, customPaths);
  });

  it('searches in additional custom dirs', () => {
    const customDirs = [testDir, '/non/existent/dir'].map(normalizePath);
    const nvimRes = findNvim({ dirs: customDirs });

    assert(nvimRes.matches.length >= 1);
    assert.strictEqual(nvimRes.invalid.length, 1);
    assert.strictEqual(nvimRes.invalid[0].path, nvimExecutablePath);
  });
});
