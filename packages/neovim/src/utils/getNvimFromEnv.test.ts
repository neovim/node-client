/* eslint-env jest */
// eslint-disable-next-line import/no-extraneous-dependencies
import * as which from 'which';
import { getNvimFromEnv } from './getNvimFromEnv';

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
  it('Gets matching nvim from specified min version', async () => {
    const nvim = getNvimFromEnv('0.3.0');
    expect(nvim).toBeTruthy();
    expect(nvim).toEqual({
      nvimVersion: expect.any(String),
      path: expect.any(String),
      buildType: expect.any(String),
      luaJitVersion: expect.any(String),
    });
    expect(nvim!.nvimVersion).toBeTruthy();
  });
});
