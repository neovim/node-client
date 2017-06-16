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

describe('Window API', () => {
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

  it('gets the current Window', async () => {
    const win = await nvim.window;
    expect(win).toBeInstanceOf(nvim.Window);
  });

  describe('Normal API calls', () => {
    let win;

    beforeEach(async () => {
      win = await nvim.window;
    });

    afterAll(() => nvim.command('tabclose'));

    it('gets the current win number', async () => {
      expect(await win.number).toBe(1);
    });

    it('is a valid win', async () => {
      expect(await win.valid).toBe(true);
    });

    it('gets current tabpage from window', async () => {
      expect(await win.tabpage).toBeInstanceOf(nvim.Tabpage);
    });

    it('gets current buffer from window', async () => {
      expect(await win.buffer).toBeInstanceOf(nvim.Buffer);
    });

    it('gets current cursor position', async () => {
      expect(await win.cursor).toEqual([1, 0]);
    });

    it('has same cursor position after appending a line to buffer', async () => {
      win.buffer.append(['test']);
      expect(await win.buffer.lines).toEqual(['', 'test']);
      expect(await win.cursor).toEqual([1, 0]);
    });

    it('changes cursor position', async () => {
      win.cursor = [2, 2];
      expect(await win.cursor).toEqual([2, 2]);
    });

    it('has correct height after ":split"', async () => {
      const currentHeight = await win.height;
      nvim.command('split');
      // XXX: Not sure if this is correct, but guessing after a split we lose a row
      // due to status bar?
      expect(await win.height).toEqual(Math.floor(currentHeight / 2) - 1);

      win.height = 5;
      expect(await win.height).toEqual(5);

      nvim.command('q');
      expect(await win.height).toEqual(currentHeight);
    });

    it('has correct width after ":vsplit"', async () => {
      const width = await win.width;
      nvim.command('vsplit');
      // XXX: Not sure if this is correct, but guessing after a vsplit we lose a col
      // to gutter?
      expect(await win.width).toEqual(Math.floor(width / 2) - 1);

      win.width = 10;
      expect(await win.width).toEqual(10);

      nvim.command('q');
      expect(await win.width).toEqual(width);
    });

    it('can get the window position', async () => {
      expect(await win.position).toEqual([0, 0]);
      expect(await win.row).toBe(0);
      expect(await win.col).toBe(0);
    });

    it('has the right window positions in display cells', async () => {
      let windows;
      nvim.command('vsplit');

      // XXX If we re-use `win` without a new call to `nvim.window`,
      // then `win` will reference the new split
      win = await nvim.window;
      expect(await win.row).toBe(0);
      expect(await win.col).toBe(0);

      windows = await nvim.windows;
      // Set to new split
      nvim.window = windows[1];

      win = await nvim.window;
      expect(await win.row).toBe(0);
      expect((await win.col) > 0).toBe(true);

      nvim.command('split');
      windows = await nvim.windows;
      nvim.window = windows[2];

      win = await nvim.window;
      expect((await win.row) > 0).toBe(true);
      expect((await win.col) > 0).toBe(true);
    });
  });

  describe.skip('Chainable API calls', () => {
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
