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
      await nvim.command('split');
      // XXX: Not sure if this is correct, but guessing after a split we lose a row
      // due to status bar?
      expect(await win.height).toEqual(Math.floor(currentHeight / 2) - 1);

      win.height = 5;
      expect(await win.height).toEqual(5);

      await nvim.command('q');
      expect(await win.height).toEqual(currentHeight);
    });

    it('has correct width after ":vsplit"', async () => {
      const width = await win.width;
      await nvim.command('vsplit');
      // XXX: Not sure if this is correct, but guessing after a vsplit we lose a col
      // to gutter?
      expect(await win.width).toEqual(Math.floor(width / 2) - 1);

      win.width = 10;
      expect(await win.width).toEqual(10);

      await nvim.command('q');
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

    it('changes window options', async () => {
      const list = await win.getOption('list');
      win.setOption('list', true);
      expect(await win.getOption('list')).toBe(true);
      win.setOption('list', false);
      expect(await win.getOption('list')).toBe(false);
      // Restore option
      win.setOption('list', list);
      expect(await win.getOption('list')).toBe(list);
    });

    it('returns null if variable is not found', async () => {
      const test = await win.getVar('test');
      expect(test).toBe(null);
    });

    it('can set a w: variable', async () => {
      win.setVar('test', 'testValue');

      expect(await win.getVar('test')).toBe('testValue');

      expect(await nvim.eval('w:test')).toBe('testValue');
    });

    it('can delete a w: variable', async () => {
      win.deleteVar('test');

      expect(await nvim.eval('exists("w:test")')).toBe(0);

      expect(await win.getVar('test')).toBe(null);
    });
  });

  describe('Chainable API calls', () => {
    it('gets the current tabpage', async () => {
      expect(await nvim.window.tabpage).toBeInstanceOf(nvim.Tabpage);
    });

    it('is a valid window', async () => {
      expect(await nvim.window.valid).toBe(true);
    });

    it('gets the current buffer', async () => {
      expect(await nvim.window.buffer).toBeInstanceOf(nvim.Buffer);
    });

    it.skip('gets current lines in buffer', async () => {
      console.log(nvim.window.buffer.append);
      expect(await nvim.window.buffer.lines).toEqual(['test']);
    });
  });
});
