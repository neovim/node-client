/* eslint-env jest */
import * as cp from 'child_process';
// // eslint-disable-next-line import/no-extraneous-dependencies
import * as which from 'which';
import { attach } from '../attach';

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

describe('Tabpage API', () => {
  let proc;
  let nvim;

  beforeAll(async done => {
    proc = cp.spawn(
      'nvim',
      ['-u', 'NONE', '-N', '--embed', '-c', 'set noswapfile', 'test.js'],
      {
        cwd: __dirname,
      }
    );

    nvim = await attach({ proc });
    done();
  });

  afterAll(() => {
    nvim.quit();
    if (proc) {
      proc.disconnect();
    }
  });

  beforeEach(() => {});

  it('gets the current Tabpage', async () => {
    const tabpage = await nvim.tabpage;
    expect(tabpage).toBeInstanceOf(nvim.Tabpage);
  });

  describe('Normal API calls', () => {
    let tabpage;

    beforeEach(async () => {
      tabpage = await nvim.tabpage;
    });

    afterAll(() => nvim.command('tabclose'));

    it('gets the current tabpage number', async () => {
      expect(await tabpage.number).toBe(1);
    });

    it('is a valid tabpage', async () => {
      expect(await tabpage.valid).toBe(true);
    });

    it('adds a tabpage and switches to it', async () => {
      nvim.command('tabnew');

      // Switch to new tabpage
      const tabpages = await nvim.tabpages;
      expect(tabpages.length).toBe(2);

      nvim.tabpage = tabpages[tabpages.length - 1];

      const newTabPage = await nvim.tabpage;
      expect(await newTabPage.number).toBe(2);
    });

    it('gets current window in tabpage', async () => {
      const window = await tabpage.window;

      expect(window).toBeInstanceOf(nvim.Window);
    });

    it('gets list of windows in tabpage', async () => {
      const windows = await tabpage.windows;

      expect(windows.length).toBe(1);

      // Add a new window
      await nvim.command('vsplit');

      const newWindows = await tabpage.windows;
      expect(newWindows.length).toBe(2);
    });

    it('logs an error when calling `getOption`', () => {
      const spy = jest.spyOn(tabpage.logger, 'error');

      tabpage.getOption('option');
      expect(spy.mock.calls.length).toBe(1);

      tabpage.setOption('option', 'value');
      expect(spy.mock.calls.length).toBe(2);
      spy.mockClear();
    });

    it('returns null if variable is not found', async () => {
      const test = await tabpage.getVar('test');
      expect(test).toBe(null);
    });

    it('can set a t: variable', async () => {
      tabpage.setVar('test', 'testValue');

      expect(await tabpage.getVar('test')).toBe('testValue');

      expect(await nvim.eval('t:test')).toBe('testValue');
    });

    it('can delete a t: variable', async () => {
      tabpage.deleteVar('test');

      expect(await nvim.eval('exists("t:test")')).toBe(0);

      expect(await tabpage.getVar('test')).toBe(null);
    });
  });

  describe('Chainable API calls', () => {
    it('gets the current tabpage number', async () => {
      expect(await nvim.tabpage.number).toBe(1);
    });

    it('is a valid tabpage', async () => {
      expect(await nvim.tabpage.valid).toBe(true);
    });

    it('adds a tabpage and switches to it', async () => {
      nvim.command('tabnew');

      // Switch to new tabpage
      const tabpages = await nvim.tabpages;
      // TODO
      expect((await nvim.tabpages).length).toBe(2);

      nvim.tabpage = tabpages[tabpages.length - 1];

      expect(await nvim.tabpage.number).toBe(2);
    });

    it('gets current window in tabpage', async () => {
      const window = await nvim.tabpage.window;

      expect(window).toBeInstanceOf(nvim.Window);
    });

    it('gets list of windows in tabpage', async () => {
      const windows = await nvim.tabpage.windows;

      expect(windows.length).toBe(1);

      // Add a new window
      nvim.command('vsplit');

      // TODO
      expect((await nvim.tabpage.windows).length).toBe(2);
    });
  });
});
