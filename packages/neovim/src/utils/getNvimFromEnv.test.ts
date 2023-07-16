/* eslint-env jest */
// eslint-disable-next-line import/no-extraneous-dependencies
import which from 'which';
import { getNvimFromEnv, compareVersions } from './getNvimFromEnv';

try {
  which.sync('nvim');
} catch (e) {
  // eslint-disable-next-line no-console
  console.error(
    'A Neovim installation is required to run the tests',
    '(see https://github.com/neovim/neovim/wiki/Installing)'
  );
  process.exit(1);
}

describe('get_nvim_from_env', () => {
  it('Compare versions', () => {
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

  it('Get matching nvim from specified min version', () => {
    const nvimRes = getNvimFromEnv({ minVersion: '0.3.0' });
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

  it('Get matching nvim without specified min version', () => {
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
