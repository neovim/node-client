/* eslint-env jest */
const cp = require('child_process');
// eslint-disable-next-line import/no-extraneous-dependencies
const which = require('which');
const attach = require('../attach');

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
      proc.kill();
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
      nvim.command('vsplit');

      const newWindows = await tabpage.windows;
      expect(newWindows.length).toBe(2);
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
