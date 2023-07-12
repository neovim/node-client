/* eslint-env jest */
// eslint-disable-next-line import/no-extraneous-dependencies
import * as which from 'which';
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
    const nvim = getNvimFromEnv('0.3.0');
    expect(nvim).toBeTruthy();
    expect(nvim).toEqual({
      nvimVersion: expect.any(String),
      path: expect.any(String),
      buildType: expect.any(String),
      luaJitVersion: expect.any(String),
    });
    /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
    expect(nvim!.nvimVersion).toBeTruthy();
  });
});
