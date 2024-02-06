/* eslint-env jest */
// eslint-disable-next-line import/no-extraneous-dependencies
import which from 'which';
import { getNvimFromEnv, exportsForTesting } from './getNvimFromEnv';

const parseVersion = exportsForTesting.parseVersion;
const compareVersions = exportsForTesting.compareVersions;

try {
  which.sync('nvim');
} catch (e) {
  // eslint-disable-next-line no-console
  throw new Error(
    'Nvim is required to run the tests (see https://github.com/neovim/neovim/wiki/Installing)'
  );
}

describe('getNvimFromEnv', () => {
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
  });

  it('gets Nvim matching specified min version', () => {
    const nvimRes = getNvimFromEnv({ minVersion: '0.3.0', orderBy: 'desc' });
    expect(nvimRes).toBeTruthy();
    expect(nvimRes).toEqual({
      matches: expect.any(Array),
      unmatchedVersions: expect.any(Array),
      errors: expect.any(Array),
    });
    expect(nvimRes.matches.length).toBeTruthy();
    expect(nvimRes.matches.length).toBeGreaterThan(0);
    expect(nvimRes.matches[0]).toEqual({
      nvimVersion: expect.any(String),
      path: expect.any(String),
      buildType: expect.any(String),
      luaJitVersion: expect.any(String),
    });
    expect(nvimRes.unmatchedVersions.length).toEqual(0);
    expect(nvimRes.errors.length).toEqual(0);
  });

  it('gets Nvim without specified min version', () => {
    const nvimRes = getNvimFromEnv();
    expect(nvimRes).toBeTruthy();
    expect(nvimRes).toEqual({
      matches: expect.any(Array),
      unmatchedVersions: expect.any(Array),
      errors: expect.any(Array),
    });
    expect(nvimRes.matches.length).toBeTruthy();
    expect(nvimRes.matches.length).toBeGreaterThan(0);
    expect(nvimRes.matches[0]).toEqual({
      nvimVersion: expect.any(String),
      path: expect.any(String),
      buildType: expect.any(String),
      luaJitVersion: expect.any(String),
    });
    expect(nvimRes.unmatchedVersions.length).toEqual(0);
    expect(nvimRes.errors.length).toEqual(0);
  });
});
